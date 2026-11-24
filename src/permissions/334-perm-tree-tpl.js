/* ملف مولَّد — لا يُحرَّر يدوياً، المصدر: src/slots/permissions/334-perm-tree-tpl.js.tpl */
/* ═══ شجرةُ صلاحيات الموظف · القوالب · الواجهتان العامتان BassamPerm وBassamAuth ═══
   KIVO_257 · AUD-010: جزءٌ 5/6 من «src/auth/330-auth-perm.js» السابقة — مقسومةً بالمسؤولية بـtools/split_iife.mjs (tools/split/330-auth-perm.json)؛
   التبعياتُ بين الأجزاء صريحةٌ هنا وعبر المساحة الداخلية window.__BS_I.auth وحدها. */
(function(){
  var I = KIVO.__BS_I && KIVO.__BS_I.auth; if (!I || I.dead) return;   /* الجزءُ الأول لم يُحمَّل أو خرج مبكّراً ⇒ لا شيءَ بعده — كالـIIFE الواحدة */
  /* ← من الأجزاء السابقة */
  var ALL_ACTS = I.ALL_ACTS, D = I.D, K_PERM = I.K_PERM, K_SESS = I.K_SESS, K_USERS = I.K_USERS, LENS_KEYS = I.LENS_KEYS, LENS_REG = I.LENS_REG,
      NAV2PERM = I.NAV2PERM, NAV_REG = I.NAV_REG, P24_DERIVE = I.P24_DERIVE, PAGE_KEYS = I.PAGE_KEYS, PAGE_OF = I.PAGE_OF, PAGE_REG = I.PAGE_REG,
      PERM2NAV = I.PERM2NAV, PW_MIN = I.PW_MIN, RAW = I.RAW, _bustUsers = I._bustUsers, activateStaff = I.activateStaff,
      activateStaffMany = I.activateStaffMany, azKey = I.azKey, azZ = I.azZ, backupSuper = I.backupSuper, can = I.can, canSub = I.canSub,
      capAllPerms = I.capAllPerms, capSetAnywhere = I.capSetAnywhere, changeOwnAccount = I.changeOwnAccount, cleanLeafPerms = I.cleanLeafPerms,
      clearEmpPerms = I.clearEmpPerms, countOrphanDeptAccounts = I.countOrphanDeptAccounts, cur = I.cur, curDept = I.curDept, curPub = I.curPub,
      deptAccountsCount = I.deptAccountsCount, deptCap = I.deptCap, deptLenses = I.deptLenses, deptManagerPub = I.deptManagerPub,
      deptManagersPub = I.deptManagersPub, deptSubs = I.deptSubs, deptTabs = I.deptTabs, derivePages = I.derivePages, dropEmpPerms = I.dropEmpPerms,
      effCap = I.effCap, empLens = I.empLens, empPagePerms = I.empPagePerms, empPerms = I.empPerms,
      expandPerms = I.expandPerms, freezeStaff = I.freezeStaff, gmDepts = I.gmDepts, gmKeyOf = I.gmKeyOf, gmRoleLabel = I.gmRoleLabel,
      groupManagerPub = I.groupManagerPub, groupManagersPub = I.groupManagersPub, hasCap = I.hasCap, hasOwnSheet = I.hasOwnSheet, hashPw = I.hashPw,
      isContainer = I.isContainer, isGmKey = I.isGmKey, isMgrKey = I.isMgrKey, isSuper = I.isSuper, leafKeysOf = I.leafKeysOf, leafReg = I.leafReg,
      login = I.login, mgrKeyOf = I.mgrKeyOf, navOrder = I.navOrder, needsPwChange = I.needsPwChange, onAny = I.onAny, onCap = I.onCap,
      orderRows = I.orderRows, p24Apply = I.p24Apply, p24Assignable = I.p24Assignable, p24Ceil = I.p24Ceil,
      p24Cover = I.p24Cover, p24Delta = I.p24Delta, p24Effective = I.p24Effective, p24GrantOf = I.p24GrantOf, p24Grantable = I.p24Grantable,
      p24Ix = I.p24Ix, p24KeyOn = I.p24KeyOn, p24LeafOn = I.p24LeafOn, p24LensHosted = I.p24LensHosted, p24LensOf = I.p24LensOf, p24R = I.p24R,
      p24SetGrant = I.p24SetGrant, p24Translate = I.p24Translate,
      pinRole = I.pinRole,
      pruneDeptAccounts = I.pruneDeptAccounts, pruneOrphanEmpPerms = I.pruneOrphanEmpPerms, pubUsers = I.pubUsers,
      purgeDeptAccounts = I.purgeDeptAccounts, pwCheck = I.pwCheck, pwRuleText = I.pwRuleText, rawCap = I.rawCap, rawUsers = I.rawUsers,
      removeBackupSuper = I.removeBackupSuper, removeDeptManager = I.removeDeptManager,
      removeGroupManager = I.removeGroupManager, removeStaffAccount = I.removeStaffAccount, roleTitle = I.roleTitle, seedCapFrom = I.seedCapFrom,
      setDeptCap = I.setDeptCap, setDeptLenses = I.setDeptLenses, setDeptManager = I.setDeptManager, setDeptManagerDis = I.setDeptManagerDis,
      setDeptSubs = I.setDeptSubs, setDeptTabs = I.setDeptTabs, setEmpLens = I.setEmpLens, setEmpPerms = I.setEmpPerms,
      setGroupManager = I.setGroupManager, setGroupManagerDis = I.setGroupManagerDis, setStaffMgr = I.setStaffMgr,
      setSuperAccount = I.setSuperAccount, siteMap = I.siteMap, splitLeaf = I.splitLeaf, staffIsMgr = I.staffIsMgr, staffMap = I.staffMap,
      staffStatus = I.staffStatus, subKeysOf = I.subKeysOf, subOn = I.subOn, tabKeysOf = I.tabKeysOf, tabOn = I.tabOn, taken = I.taken,
      unCheck = I.unCheck, upsertBackupSuper = I.upsertBackupSuper, visiblePages = I.visiblePages,
      writeUsers = I.writeUsers;
  /* V7 · د5-هـ (44): شجرةُ صلاحيات الموظف القديمة (الصفحة × الأفعال الستة) وقواعدُ تحريرها حُذفت مع
     نافذة صلاحيات الموظف وقوالب الصلاحيات — الأدوارُ تُدار من تبويب «الصلاحيات». أسماءُ الأفعال الستة باقية للعرض. */
  var ACT_NAMES = { view:'عرض', add:'إضافة', edit:'تعديل', del:'حذف', approve:'اعتماد', export:'تصدير' };
  /* اسم مفتاح صلاحية — صفحة أو ورقة «pk/sk» */
  function nameOf(key){
    var sp = splitLeaf(key), p = PAGE_OF[sp.page]; if (!p) return key;
    if (!sp.sub) return p.name;
    var x = (p.subs || []).concat(p.tabs || []).filter(function(z){ return z.key === sp.sub; })[0];
    return p.name + ' · ' + (x ? x.name : sp.sub);
  }
  /* مفتاحُ العرض الأوّل للمالك (access/view بترتيب السجلّ — نظيرُ «العرض» في الورقة القديمة): المنحُ الجديد لورقةٍ على شجرة v24.9 يبدأ به وحده */
  function p24PrimView(owner, keys){
    var R = p24R(); if (!R) return '';
    var ks = keys || R.byOwner[owner] || [];
    for (var i = 0; i < ks.length; i++) { var e = R.byKey[ks[i]]; if (e && e.status === 'active' && e.owner === owner && (e.type === 'access' || e.type === 'view')) return ks[i]; }
    return '';
  }
  /* ═══ التحديث الحيّ للصلاحيات: أي تغيير يصل من الخادم (أو من تبويب آخر) في الصلاحيات أو الحسابات أو الإدارات
     يُبطل النسخ المحفوظة في الذاكرة فوراً — كانت تبقى القديمة حتى إعادة التحميل ═══ */
  (function(){
    function onStore(ev){
      try {
        var k = String((ev && ev.detail && ev.detail.key) || (ev && ev.key) || '');
        if (!k) { I._pmMemo = null; _bustUsers(); return; }
        if (k.indexOf(K_PERM) !== -1 || k.indexOf('bassam_depts_v1') !== -1 || k.indexOf('bassam_gdepts_v1') !== -1) I._pmMemo = null;
        if (k.indexOf(K_USERS) !== -1) _bustUsers();
      } catch(e){}
    }
    try { window.addEventListener('bassam:store', onStore); window.addEventListener('storage', onStore); } catch(e){}
  })();
  /* ═══ مفتاح التخزين → مفتاح القدرة التي يخصّها (لتجميع أسماء المجموعات في النسخ والمسح حسب سقف الإدارة) ═══ */
  var KEY_CAP = { bassam_employees_v1:'emps', bassam_options_v1:'emps', bassam_custody_v1:'emps/custody',
    bassam_staffing_v3:'staff', bassam_staffing_v2:'staff', bassam_staffing_snap_v1:'staff', bassam_staffing_locks_v1:'staff', bassam_callsigns_v1:'staff',
    bassam_shift_options_v1:'admin/shifts',
    bassam_plan_v1:'plan', bassam_zone_opts_v1:'plan', bassam_gate_opts_v1:'plan', bassam_mark_kinds_v1:'plan',
    bassam_rounds_v1:'daily/rounds', bassam_dreport_v1:'dreport', bassam_dr_grp_v1:'dreport', bassam_leave_kinds_v1:'dreport',
    bassam_tasks_v1:'tasks', bassam_tasks_locks_v1:'tasks',
    bassam_irshad_v1:'irshad', bassam_irshad_langs_v1:'irshad', bassam_irshad_locs_v1:'irshad',
    bassam_seized_v1:'seized', bassam_seized_cat_v1:'seized', bassam_seized_acts_v1:'seized', bassam_seized_locs_v1:'seized', bassam_seized_jew_v1:'seized',
    bassam_rasd_v1:'rasd', bassam_rasd_opts_v1:'rasd',
    bassam_award_v1:'award', bassam_award_docs_v1:'award', bassam_award_docs_v2:'award' };
  function keyCap(k){ var b = String(k || '').replace(/^bsdept:[^:]+:/, '').replace(/:.*$/, ''); return KEY_CAP[b] || ''; }
  function keyOn(k, did){ try { if ((KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper())) return true; /* V7 · د1-ج: مدير المنصة بلا قيد */ var c = keyCap(k); return c ? onCap(c, did) : true; } catch (e) { return true; } }
  /* R188: «هل يملك المستخدمُ الحاليُّ الكتابةَ في هذا المورد؟» — من ورقته (keyCap) وأفعاله. تُسأل قبل أي كتابةٍ
     لا يطلبها المستخدم (ترحيلٌ عند الفتح · إنشاءٌ تلقائيّ) فلا تُرسل كتابةٌ يرفضها الخادم ويُعيدها برسالةٍ حمراء */
  function canW(k, act){ try { var c = keyCap(k); if (!c) return true; return can(c, act || 'edit'); } catch (e) { return true; } }

  /* R180: أوراقُ حاوية العرض من سجلّها — كلُّ ورقةٍ تُضاف إلى refs تدخل حارسَ الرابط والتنقّل تلقائياً */
  function navLeaves(key){ var g = NAV_REG.filter(function(x){ return x.key === key; })[0];
    return g ? (g.refs || []).map(function(r){ var sp = splitLeaf(r); return [sp.page, sp.sub]; }) : []; }
  /* KIVO_261 · SOT-003/010 (كشفه k261tree): هل تُرسم لوحةُ «مؤشرات الإدارة» هذه للمستخدم؟ — الورقةُ ∧ شروطُ اللوحة نفسُها (كانت في وحدة المؤشرات وحدها،
     فمن مُنح «مؤشرات التشغيل اليومي» دون «التقرير اليومي» يرى رابطَ «مؤشرات الإدارة» إلى صفحةٍ تقول «لا مؤشرات ممنوحة لك»). مصدرٌ واحد للرابط والصفحة. */
  /* V7 · د5-ح (قرار المالك): لا استثناءَ لمدير المنصة — صلاحياتُه (myPerms) كلُّ شيءٍ إلا المطفأ على المنصة أو لهذه الإدارة، فلوحةُ نظامٍ مطفأ لا تُرسم لأحد.
     P (اختياري): صلاحياتُ غيره {ورقة: [أفعال]} — لقائمة «ما يراه مدير هذه الإدارة» (menuFor) بالقاعدة نفسِها · did: وحدتُه */
  function kpiPanelOk(pk, sk, P, did){
    try {
      var pv = P ? function(k){ return !!(P[k] && P[k].indexOf('view') !== -1); } : null;
      if (!sk) return pv ? pv(pk) : can(pk, 'view');   /* V7 P4 · G6: لوحةُ صفحةٍ كاملة (مرجعٌ بلا «/» في refs — «مؤشرات المهام») يمنحها مفتاحُ عرض الصفحة نفسُه */
      if (!(pv ? pv(pk + '/' + sk) : canSub(pk, sk, 'view'))) return false;
      if (sk === 'kpiOcc') return onCap('zones', did) && onCap('dens', did);
      if (sk === 'kpiZones') return onCap('zones', did);
      if (sk === 'kpiDaily') return pv ? pv('dreport') : can('dreport', 'view');
      return true;
    } catch (e) { return false; }   /* KIVO_261 (المراجعةُ المستقلة): العطلُ يُخفي (كما كان فحصُ الرابط في الغلاف) لا يُظهر */
  }
  /* ═══ V7 · د5-ح (قرار المالك): القائمةُ الجانبية من مصدرٍ واحد ═══
     menuFor(P, did) — روابطُ القائمة الجانبية بترتيبها (navOrder: العمل · المراجع · الإدارة) لحامل الصلاحيات P في الوحدة did:
     الرابطُ ظاهرٌ إن ملك عرضَ صفحته (الحاويةُ: عرضُها أو عرضُ صفحةٍ تسكنها · «مؤشرات الإدارة»: لوحةٌ واحدة تُرسم له · «المساعدة»: ومعها إعدادُ المنصة).
     P غائب ⇒ صلاحياتُ الجلسة نفسها (myPerms) — والغلافُ يرسم القائمة منها (root-logic _navMenu) فالقائمتان واحدة.
     hid: أخفاه إعدادُ المنصة (side.hidden) فلا يُرسم وإن ملكه */
  function menuFor(P, did){
    var perms = P || I.myPerms(), NO = I.navOrder(), out = [], pl = null;
    try { pl = KIVO.BassamPlat && KIVO.BassamPlat.get && KIVO.BassamPlat.get(); } catch (e) {}
    var hiddenSide = (pl && pl.side && pl.side.hidden) || [], helpSide = !(pl && pl.side && pl.side.help === false);
    var pv = function(k){ return !!(perms[k] && perms[k].indexOf('view') !== -1); };
    var nameOf0 = function(k){ var p = PAGE_OF[k]; if (p) return p.name; var g = NAV_REG.filter(function(x){ return x.key === k; })[0]; return g ? g.name : k; };
    /* V7 · د6: اسمُ البند بنوع الوحدة — «مؤشرات القسم» · «موظفو القسم» حين تكون الوحدةُ قسماً (BassamDepts.unitAl). الاسمُ هنا وحده: القائمةُ المرسومة
       (root-logic) والبطاقاتُ (seenBy) تأخذانه من هذا المصدر */
    var unitAl = 'الإدارة'; try { var D0 = KIVO.BassamDepts; if (D0 && D0.unitAl) unitAl = D0.unitAl(did || curDept()) || unitAl; } catch (e) { unitAl = 'الإدارة'; }
    var unitName = function(n){ return unitAl !== 'الإدارة' && / الإدارة$/.test(n) ? n.replace(/ الإدارة$/, ' ' + unitAl) : n; };
    NO.groups.forEach(function(g){ g.keys.forEach(function(k){
      var on;
      if (k === 'kpis') on = navLeaves('kpis').some(function(x){ return kpiPanelOk(x[0], x[1], P || null, did); });
      else if (isContainer(k) || PAGE_REG.some(function(p){ return p.under === k; })) on = pv(k) || PAGE_REG.some(function(p){ return p.under === k && pv(p.key); });
      else on = pv(k);
      if (k === 'help') on = on && helpSide;
      out.push({ k: k, n: unitName(nameOf0(k)), on: !!on, hid: hiddenSide.indexOf(k) !== -1 });
    }); });
    return out;
  }
  /* صلاحياتُ مدير وحدةٍ did (بلا ورقةٍ مخزّنة — يرث سقفَها كاملاً) كما تحسبها 331 لحسابه: سقفُ الوحدة ∖ المطفأ على المنصة */
  function mgrPerms(did){ return I.platCut(capAllPerms(did)); }   /* V7 · د6 (أ1): القصُّ نفسُه الذي في myPerms (331 platCut) */
  /* ═══ V7 · د6 (أ1 — قرار المالك): «ما يراه حاملٌ» من مصدرٍ واحد ═══
     القائمةُ الجانبية الفعلية · «ما يراه مدير هذه الإدارة» · «ماذا يرى حامل الدور» · «ما يراه الآن» للشخص: كلُّها seenBy(h) = menuFor(holderPerms(h), h.did)
     — القواعدُ قواعدُ menuFor وحدها، والفرقُ الوحيد بين الحاملين مجموعةُ الصلاحيات التي تُغذّى بها:
       { kind: 'session' }                      الجلسةُ نفسُها (myPerms — من مفاتيح الخادم)
       { kind: 'mgr', did }                     مديرُ الوحدة did (يرث سقفَها كاملاً)
       { kind: 'role', did, keys }              حاملُ دورٍ في did: keys = مفاتيحُ الدور المترجَمة داخل السقف (KIVO.Perm44.compileRole) — بلا ورقةٍ قديمة
       { kind: 'person', did, ekey, mgr, keys } شخصٌ بعينه: المحفوظُ له (ورقتُه · منحُه · استثناءاتُه السارية) — أو keys: مفاتيحُه الفعّالة من مسودة
                                                المحرّر (KIVO.Perm44.effective) قبل الحفظ · mgr: حسابُه يحمل شارةَ المدير
     وصلاحياتُ غير الجلسة تُشتقّ بقاعدة الجلسة نفسِها (331 heldPerms) من المفاتيح التي كان الخادمُ سيحملها له (057 enfHeld0: السقف · العدسة ·
     الترجمة + المنح − الإسقاط · مهلةُ الاستثناء) — واختبارُ tests/unit/v7_d6_one_menu_source يطابقها بجواب الخادم لكل حساب. */
  function holderKeys(did, ekey, mgr, inherit, sheet){
    var G = p24GrantOf(ekey, did), now = Date.now(), un = G.until;
    var plus = G.plus.filter(function(k){ return !(un && typeof un[k] === 'number' && un[k] <= now); });   /* استثناءٌ انتهت مهلتُه لا يُحمل (057 enfGrantOf) */
    var E = p24Effective({ ekey: ekey, did: did, mgr: mgr, sheet: sheet, inherit: inherit, grant: { plus: plus, minus: G.minus, src: G.src } }) || { keys: {} };
    return { keys: E.keys, plus: plus };
  }
  /* مفاتيحُ لا تُمنح بالورقة ولا بالدور ويحملها صاحبُها بحكم موضعه (057 enfHeld0: self للجميع · role:mgr لمدير الوحدة) */
  function standingKeys(H, mgr){
    var R = p24R(), ix = p24Ix(); if (!R || !ix) return H;
    R.keys.forEach(function(k){
      var e = R.byKey[k]; if (!e || e.status !== 'active' || ix.superOnly[k]) return;
      if (e.grant === 'self' || (e.grant === 'role' && ix.needMgr[k] && mgr)) H[k] = true;
    });
    return H;
  }
  function keysPerms(did, all, keys, plus, mgr){
    var H = {}, C = null;
    try { C = KIVO.Perm44 && KIVO.Perm44.ceiling ? KIVO.Perm44.ceiling(did).key : null; } catch (e) { C = null; }
    (keys || []).forEach(function(k){ if (!C || C(k)) H[k] = true; });   /* السقفُ بالوراثة ∩ المنصة — ما كان الخادمُ ليحمله خارجَه */
    if (!plus) plus = Object.keys(H);   /* = perm44 grantOf: منحُ صاحب الدور أو الاستثناء (plus) هو مفاتيحُه الفعّالة كلُّها */
    return I.heldPerms(I.platCut(all || {}), standingKeys(H, mgr), plus, did);
  }
  function holderPerms(h){
    h = h || {};
    var kind = h.kind || 'session', d = h.did || curDept();
    if (kind === 'session') return I.myPerms();
    if (kind === 'mgr') return mgrPerms(d);
    if (kind === 'role') return keysPerms(d, null, h.keys || [], null, false);
    if (kind === 'person') {
      var ek = String(h.ekey || ''), mgr = h.mgr !== undefined ? !!h.mgr : isMgrKey(ek), inherit = mgr && !hasOwnSheet(ek, d);
      var sheet = inherit ? capAllPerms(d) : empPerms(ek, d), all = inherit ? capAllPerms(d) : derivePages(empPerms(ek, d));
      if (Array.isArray(h.keys)) return keysPerms(d, all, h.keys, null, mgr);
      var K = holderKeys(d, ek, mgr, inherit, sheet);
      return keysPerms(d, all, Object.keys(K.keys), K.plus, mgr);
    }
    return {};
  }
  /* صفوفُ القائمة كاملةً [{ k, n, on, hid }] — للجلسة menuFor() نفسُها (بلا P: لوحاتُ المؤشرات تُسأل من الجلسة) */
  function menuOf(h){ var kind = (h && h.kind) || 'session'; return kind === 'session' ? menuFor() : menuFor(holderPerms(h), (h && h.did) || curDept()); }
  /* ما يُرسم له فعلاً: «صفحتي» (لكل صاحب حساب) ثم الروابطُ المملوكة غيرُ المخفيّة بإعداد المنصة — [{ k, n }] */
  function seenBy(h){
    return [{ k: 'profile', n: 'صفحتي' }].concat(menuOf(h).filter(function(x){ return x.on && !x.hid; }).map(function(x){ return { k: x.k, n: x.n }; }));
  }
  KIVO.BassamPerm = { keyCap: keyCap, keyOn: keyOn, canW: canW, navOrder: navOrder, orderRows: orderRows, siteMap: siteMap, PAGE_KEYS: PAGE_KEYS, PAGE_REG: PAGE_REG, NAV_REG: NAV_REG, NAV2PERM: NAV2PERM, PERM2NAV: PERM2NAV, ALL_ACTS: ALL_ACTS, deptAccountsCount: deptAccountsCount, purgeDeptAccounts: purgeDeptAccounts, deptCap: deptCap, setDeptCap: setDeptCap, rawCap: rawCap, hasCap: hasCap, effCap: effCap, seedCapFrom: seedCapFrom, seedSectionCap: I.seedSectionCap, dropNodeCap: I.dropNodeCap, capOrphans: I.capOrphans, capSeeded: I.capSeeded, _bust: function(){ I._pmMemo = null; },
    on: onCap, onAny: onAny, capSetAnywhere: capSetAnywhere, capState: I.capState, capOwnOf: I.capOwnOf, setCapOwn: I.setCapOwn, latentLeaves: I.latentLeaves, LENS_KEYS: LENS_KEYS, LENS_REG: LENS_REG, deptLenses: deptLenses, setDeptLenses: setDeptLenses, lensOn: I.lensOn,
    PAGE_OF: PAGE_OF, subKeysOf: subKeysOf, deptSubs: deptSubs, setDeptSubs: setDeptSubs, subOn: subOn,
    tabKeysOf: tabKeysOf, deptTabs: deptTabs, setDeptTabs: setDeptTabs, tabOn: tabOn,
    empPerms: empPerms, setEmpPerms: setEmpPerms, clearEmpPerms: clearEmpPerms, empPagePerms: empPagePerms, capAllPerms: capAllPerms, hasOwnSheet: hasOwnSheet,
    isContainer: isContainer, leafKeysOf: leafKeysOf, leafReg: leafReg, splitLeaf: splitLeaf, expandPerms: expandPerms, derivePages: derivePages, canSub: canSub,
    empLens: empLens, setEmpLens: setEmpLens, nameOf: nameOf, ACT_NAMES: ACT_NAMES,
    dropEmpPerms: dropEmpPerms, pruneOrphanEmpPerms: pruneOrphanEmpPerms,
    platOff: I.platOff, myPerms: I.myPerms, can: can, visiblePages: visiblePages, navLeaves: navLeaves, kpiPanelOk: kpiPanelOk, menuFor: menuFor, mgrPerms: mgrPerms, holderPerms: holderPerms, menuOf: menuOf, seenBy: seenBy,
    /* V7 · د5-ح: هل حُسمت صلاحياتُ الجلسة؟ — مديرُ المنصة دائماً · وغيرُه حين تصل مفاتيحُ الخادم (__BS_AUTHZ) فلا تُرسم صفحةٌ قبل قرارها */
    ready: function(){ try { return !!(isSuper() || (I.azZ && I.azZ())); } catch (e) { return true; } },
    key: azKey, authz: function(){ return azZ(); },
    p24: { R: p24R, ix: p24Ix, ceil: p24Ceil, leafOn: p24LeafOn, keyOn: p24KeyOn, lensHosted: p24LensHosted, translate: p24Translate, grantOf: p24GrantOf, grantable: p24Grantable, assignable: p24Assignable, effective: p24Effective, delta: p24Delta, cover: p24Cover, setGrant: p24SetGrant, apply: p24Apply, lensOf: p24LensOf, DERIVE: P24_DERIVE, primView: p24PrimView } };

  /* ═══ الطاقم الإشرافي — من لا يُسكَّن على المواقع ═══
     V7 · د5-هـ (44): المعيارُ علامةُ الدور sup:true (محرّك الأدوار KIVO.Perm44) — قوالبُ الصلاحيات حُذفت، وترحيلُها (perm44-roles) نقل
     علامتَها (tp.sup أو الاستنتاجَ القديم من الاسم) إلى الدور مرّةً واحدة؛ فلا استنتاجَ من الاسم وقتَ التشغيل. بغياب المحرّك: لا أحد. */
  (function(){
    function roleOf(ekey, did){ var P4 = KIVO.Perm44; if (!ekey || !P4 || typeof P4.roleOf !== 'function') return null; try { return P4.roleOf(ekey, did) || null; } catch(e){ return null; } }
    function isSupRole(r){ return !!(r && r.sup === true); }
    function isSup(ekey, did){ return isSupRole(roleOf(ekey, did)); }
    function supName(ekey, did){ var r = roleOf(ekey, did); return isSupRole(r) ? String(r.name || '') : ''; }
    KIVO.BassamSup = { roleOf: roleOf, isSupRole: isSupRole, isSup: isSup, supName: supName };
  })();

  /* ═══ مفتاح الاختيار الموحّد: ＋ للفارغ ونصٌّ منقّط للمختار ═══ */
  KIVO.BassamPick = {
    txt: function(canEdit, open){ return "display:inline-flex;align-items:center;justify-content:center;gap:6px;max-width:100%;font-size:12px;font-weight:400;font-family:'Cairo',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.6;color:" + (canEdit ? "var(--fg-x141414)" : "var(--fg-x53565a)") + ";" + (canEdit ? ("cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;text-decoration-color:" + (open ? "var(--fg-xb99751)" : "var(--fg-a185151810p55)")) : "cursor:not-allowed;text-decoration:none"); },
    plus: function(canEdit, open){ return "width:22px;height:22px;border-radius:9999px;border:1px dashed " + (canEdit ? "#b99751;color:var(--fg-x9a7e40)" : "#cbd5e1;color:var(--fg-xcbd5e1)") + ";background:" + (open ? "var(--bg-a185151810p12)" : "transparent") + ";font-size:14px;line-height:1;display:inline-flex;align-items:center;justify-content:center;font-family:'Cairo',sans-serif;padding:0;cursor:" + (canEdit ? "pointer" : "not-allowed"); }
  };

  /* V7 · د5-هـ (44): اسمُ الصلاحية في كل مكان = اسمُ الدور الممنوح (محرّك الأدوار KIVO.Perm44.roleNameOf) — «صلاحيات مخصّصة» لمن له منحٌ بلا دور،
     و«بلا صلاحيات» لمن لا منح له. فرعُ «عدد الصفحات» حُذف. بغياب المحرّك: مخصّصةٌ أو بلا صلاحيات من منحه القائم وحده.
     تُقرأ الصلاحيات تحت أي رمز للموظف (المفتاح الموحّد أو هويته أو اسمه) — لبيانات ما قبل توحيد المفاتيح. */
  function permLabel(ekey, did){
    try {
      if (!ekey) return '';
      var P4 = KIVO.Perm44;
      if (P4 && typeof P4.roleNameOf === 'function') { var rn = P4.roleNameOf(ekey, did); if (rn) return String(rn); }
      var PM = KIVO.BassamPerm; if (!PM || !PM.empPerms) return '';
      var toks = [ekey];
      try { var list = KIVO.__BS_SRV.operations.reference('bsdept:' + (did || curDept()) + ':bassam_employees_v1') || []; var KE = KIVO.BassamEmp;
        var e = list.filter(function(x){ return ((KE && KE.key) ? KE.key(x) : (x.eid || x.nid || x.name)) === ekey || x.eid === ekey || x.nid === ekey || x.name === ekey; })[0];
        if (e) [e.eid, e.nid, e.name].forEach(function(t){ if (t && toks.indexOf(t) === -1) toks.push(t); }); } catch(e0){}
      for (var i = 0; i < toks.length; i++) { var o = PM.empPerms(toks[i], did) || {}; if (Object.keys(o).some(function(k){ return (o[k] || []).length; })) return 'صلاحيات مخصّصة'; }
      return 'بلا صلاحيات';
    } catch(e){ return ''; }
  }
  KIVO.BassamAuth = {
    permLabel: permLabel,
    PW_MIN: PW_MIN, unCheck: unCheck, pwRuleText: pwRuleText, pinRole: pinRole,
    pwCheck: pwCheck,
    users: pubUsers,
    /* KIVO_265 · أداء: حسابٌ واحد بمعرّفه من الفهرس (بلا بصمة) · وعدّادُ نسخة الجدول لذاكرات الصفحات */
    userById: function(id){ var u = I.userById ? I.userById(id) : null; if (!u) return null; var c = {}; for (var k in u) if (k !== 'ph') c[k] = u[k]; return c; },
    usersVer: function(){ return I.usersVer ? I.usersVer() : 0; },
    /* كلمة مرور مؤقتة لأي حساب بمعرّفه — لمدير النظام؛ تُفرض على صاحبها تغييرها عند أول دخول */
    resetPwById: function(uid){
      if (!isSuper()) return Promise.resolve({ ok:false, err:'لمسؤول المنصة وحده' });
      var list = rawUsers() || [], hit = list.filter(function(x){ return x.id === uid; })[0];
      if (!hit) return Promise.resolve({ ok:false, err:'الحساب غير موجود' });
      if (hit.role === 'super' && !hit.bk) return Promise.resolve({ ok:false, err:'كلمة مسؤول المنصة تُغيَّر من صفحة «حسابي»' });   /* الاحتياطي يُعاد تعيينه من هنا */
      var fw = I.acctFixedWhy(hit, false); if (fw) return Promise.resolve({ ok:false, err:fw });   /* دفعة الواجهات (2أ) */
      var digits = ''; try { var a = new Uint32Array(2); window.crypto.getRandomValues(a); digits = String(a[0] % 900000 + 100000) + String(a[1] % 90 + 10); } catch(e){ digits = String(Math.floor(Math.random()*900000+100000)) + '17'; }
      var tmp = 'Tmp' + digits;
      return hashPw(tmp).then(function(ph){
        writeUsers((rawUsers()||[]).map(function(x){ return x.id === uid ? Object.assign({}, x, { ph: ph, mc: 1, dis: 0 }) : x; }));
        /* V7 · د5-هـ (أمن ١): الكلمةُ المؤقتة تُعرض بعد إقرار الخادم (BassamAck) لا بعد الكتابة المحلية — كانت تُعرض وإن رُفض الحفظ أو تأخّر
           فيُسلَّم صاحبُ الحساب كلمةً لا تعمل */
        var A = KIVO.BassamAck; if (!A || typeof A.ack !== 'function') return { ok:true, pw: tmp };
        return Promise.resolve(A.ack()).catch(function(){ return false; }).then(function(r){
          if (r === true) return { ok:true, pw: tmp };
          return { ok:false, err: r && r.denied ? 'رفض الخادم حفظ الكلمة المؤقتة — لم تتغيّر كلمة المرور' : 'لم تُحفظ الكلمة المؤقتة بعد — لم تتغيّر كلمة المرور، أعد المحاولة' };
        });
      });
    },
    /* تجميد أو إعادة تفعيل أي حساب بمعرّفه — لمدير النظام (شاشة مدير النظام ← نظرة عامة) */
    setDisById: function(uid, on){
      if (!isSuper()) return { ok:false, err:'لمسؤول المنصة وحده' };
      var list = rawUsers() || [], hit = list.filter(function(x){ return x.id === uid; })[0];
      if (!hit) return { ok:false, err:'الحساب غير موجود' };
      if (hit.role === 'super') return { ok:false, err:'حساب مسؤول المنصة لا يُجمَّد' };
      var fw = I.acctFixedWhy(hit, !!on); if (fw) return { ok:false, err:fw };   /* دفعة الواجهات (2أ): ما يرفضه الخادم لا يُرسل */
      writeUsers(list.map(function(x){ return x.id === uid ? Object.assign({}, x, { dis: on ? 1 : 0 }) : x; }));
      return { ok:true };
    },
    usernameTaken: taken,
    acctFixedWhy: I.acctFixedWhy,
    user: curPub,
    isSuper: isSuper,
    login: login,
    logout: function(){
      if (window.__BS_BOOT && window.__BS_BOOT.cf) {
        /* آخر حفظٍ معلّق يُرسل أولاً ثم يُغلق باب الإرسال — فلا يصل طلبٌ بعد إنهاء الجلسة.
           والإرسالُ غيرُ متزامنٍ الآن، فتُؤجَّل المغادرةُ حتى يستقرّ (بسقفٍ زمنيٍّ
           فلا يعلق الخروجُ إن كانت الشبكة ميتة). */
        var byeP9 = null;
        try { if (KIVO.__BS_SRV && KIVO.__BS_SRV.bye) byeP9 = KIVO.__BS_SRV.bye(); } catch (e8) {}
        /* خروج فوري كالمواقع الاحترافية: تنقّل واحد إلى /api/logout يُنهي الجلسة ويمسح الكوكي ويعيد إلى الجذر —
           لا طلب متزامن يعلّق الصفحة ثم إعادة تحميل ثانية */
        RAW.removeItem.call(localStorage, K_SESS);
        /* V7 · د5-هـ (x1): التبويباتُ الأخرى في المتصفح نفسِه تعلم فوراً (حدثُ storage لمسح العلامة · وBroadcastChannel احتياطاً) — 335 يقفل شاشتها بلا رحلة خادم */
        try { if (typeof BroadcastChannel === 'function') { var bc9 = new BroadcastChannel('bassam-session'); bc9.postMessage({ t: 'out' }); bc9.close(); } } catch (e6) {}
        /* ستارة فورية بلون بوابة الدخول تغطي الشاشة في اللحظة نفسها — فلا تبقى أي صفحة مرئية
           أثناء رحلة الخادم (صنف bs-locked بلا CSS بعد الدخول، فلا يكفي وحده) */
        try {
          var cv = document.createElement('div'); cv.id = 'bsByeCurtain';
          cv.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:var(--bg-x1a252e)';
          (document.body || document.documentElement).appendChild(cv);
          document.documentElement.classList.add('bs-locked');
        } catch (e7) {}
        var goOut9 = function () { location.replace('/api/logout?t=' + Date.now()); };
        if (byeP9 && byeP9.then) { var once9 = 0, g9 = function () { if (once9++) return; goOut9(); };
          byeP9.then(g9, g9); setTimeout(g9, 5200); }
        else goOut9();
        return;
      }
      RAW.removeItem.call(localStorage, K_SESS); location.reload();
    },
    needsPwChange: needsPwChange,
    setSuperAccount: setSuperAccount,
    upsertBackupSuper: upsertBackupSuper, removeBackupSuper: removeBackupSuper, backupSuper: backupSuper,
    addDisplayAccount: I.addDisplayAccount, removeDisplayAccount: I.removeDisplayAccount,   /* V7 · د5-هـ (x1): «شاشة عرض» — لمسؤول المنصة */
    /* ── مدير الإدارة كحساب مستقل ── */
    mgrKeyOf: mgrKeyOf,
    isMgrKey: isMgrKey,
    deptManager: deptManagerPub,
    deptManagers: deptManagersPub,
    setDeptManager: setDeptManager,
    setDeptManagerDis: setDeptManagerDis,
    removeDeptManager: removeDeptManager,
    /* ── مدير الإدارة العامة ── */
    gmKeyOf: gmKeyOf,
    isGmKey: isGmKey,
    groupDepts: gmDepts,
    gmRoleLabel: gmRoleLabel,
    /* R191: دورُ المستخدم الحاليّ المكتوب (فارغٌ إن لم يُكتب، ولمدير النظام دائماً) */
    myTitle: function(){ var u = cur(); return (u && u.role !== 'super') ? roleTitle(u) : ''; },
    groupManager: groupManagerPub,
    groupManagers: groupManagersPub,
    setGroupManager: setGroupManager,
    setGroupManagerDis: setGroupManagerDis,
    removeGroupManager: removeGroupManager,
    /* يستعمله جدول الموظفين ليكشف تصادم الهوية/الجوال مع حساب مدير إدارة */
    mgrNumHolder: function(v){
      v = String(v||'').trim(); if (!v) return '';
      var u = (rawUsers()||[]).filter(function(x){
        return ((x.role === 'staff' && isMgrKey(x.ekey)) || x.role === 'gm') && (String(x.un||'') === v || String(x.alt||'') === v);
      })[0];
      if (!u) return '';
      if (u.role === 'gm') return 'حساب ' + gmRoleLabel(u.gid) + ' «' + (u.name || '—') + '»' + (D.groupName(u.gid) ? (' — ' + D.groupName(u.gid)) : '');
      var dn = ''; try { dn = (D.list().filter(function(d){ return d.id === u.deptId; })[0]||{}).name || ''; } catch(e){}
      return 'حساب مدير إدارة «' + (u.name || '—') + '»' + (dn ? (' — ' + dn) : '');
    },
    pruneDeptAccounts: pruneDeptAccounts,
    countOrphanDeptAccounts: countOrphanDeptAccounts,
    changeOwnAccount: changeOwnAccount,
    staffStatus: staffStatus,
    staffMap: staffMap, activateStaffMany: activateStaffMany,
    /* V7 · د6 (QA ١٢): بصمةُ كلمة المرور (p2) لمقترحات حسابات الانتقال (590 transitionPrepare يسأل BassamAuth.hashPw) — لم تكن مُصدَّرةً
       فيفشل كلُّ انتقالٍ فيه حسابٌ جديد بـ«crypto» قبل أي طلب */
    hashPw: hashPw,
    staffIsMgr: staffIsMgr,
    setStaffMgr: setStaffMgr,
    activateStaff: activateStaff,
    freezeStaff: freezeStaff,
    removeStaffAccount: removeStaffAccount,
    isStaff: function(){ var u = cur(); return !!(u && u.role === 'staff'); },
    display: function(){
      var u = cur();
      if (u && u.role === 'super') return { name: (u.name || 'مسؤول المنصة'), role: 'مسؤول المنصة', scope: 'platform' };   /* CORE-01: نطاقُه المنصة — شارةٌ ثابتة في بطاقة المستخدم لا تتبع الوحدة النشطة */
      if (u && u.role === 'dept') {
        var dn = '';
        try { dn = (D.list().filter(function(d){ return d.id === u.deptId; })[0] || {}).name || ''; } catch(e){}
        return { name: (u.name || ('مدير ' + (dn || 'الإدارة'))), role: (roleTitle(u) || dn || 'مدير إدارة') };
      }
      if (u && u.role === 'gm') return { name: (u.name || gmRoleLabel(u.gid)), role: (roleTitle(u) || gmRoleLabel(u.gid)) };
      if (u && u.role === 'staff') {
        /* بطلب المستخدم: تحت اسم الموظف صلاحيته لا كلمة «موظف» الثابتة — V7 · د5-هـ (44): اسمُ دوره الممنوح (permLabel) */
        /* مدير الإدارة المعيَّن من مدير النظام لا سجل موظف له — اسمه ومسمّاه
           من حسابه مباشرة، وإلا ظهر لنفسه «موظف» وهو مسؤول الإدارة */
        /* الدور «مدير الإدارة» مجرَّداً — اسم الإدارة معروضٌ فوقه في القائمة
           الجانبية، فتكراره في السطر نفسه حشوٌ يطيل السطر بلا معلومة */
        if (isMgrKey(u.ekey)) return { name: (u.name || 'مدير الإدارة'), role: (roleTitle(u) || 'مدير الإدارة') };
        /* الاسم يُقرأ حيّاً من سجل الموظف بمفتاحه الموحّد — فإن عُدّل في صفحة الموظفين انعكس هنا فوراً */
        var nm2 = u.name || 'موظف';
        try {
          var list2 = KIVO.__BS_SRV.operations.get('bassam_employees_v1') || [];
          var KE = KIVO.BassamEmp;
          var emp2 = KE && KE.resolve ? KE.resolve(list2, u.ekey) : list2.filter(function(x){ return x && [x.eid, x.nid, x.name].indexOf(u.ekey) !== -1; })[0];
          if (emp2) nm2 = emp2.name || nm2;
        } catch(e2){}
        var pl2 = ''; try { pl2 = permLabel(u.ekey, u.deptId); } catch(e3){}
        return { name: nm2, role: pl2 || 'موظف' };
      }
      /* كان: غياب الجلسة يسقط على هوية مدير النظام، فيرى الموظف نفسه «مدير النظام» */
      return u ? { name: (u.name || 'مستخدم'), role: '' } : { name: '—', role: 'غير مسجّل الدخول' };
    }
  };

  /* وضع كلاود فلير: الخادم هو الحكم في الجلسة. إن قال «لا جلسة عندي»
     (auth:'need') تُمحى أي جلسة متبقية في هذا الجهاز من عهدٍ سابق — وإلا
     فتحت التطبيقَ رملاً أصمّاً يبتلع كل ما يُحفظ فيه دون أن يصل الخادم. */
  var PREVIEW9 = false; try { PREVIEW9 = /[?&]bsPreview=login\b/.test(location.search); } catch (e) {}
  if (!PREVIEW9 && window.__BS_BOOT && window.__BS_BOOT.cf && window.__BS_BOOT.auth === 'need')
    RAW.removeItem.call(localStorage, K_SESS);

  var u0 = PREVIEW9 ? null : cur();            /* المعاينة: بوابة الدخول دائماً، بلا جلسة ولا تطبيق */
  /* حارس نطاق الإدارة: لكل دور إدارته — مدير الإدارة (بحساب إدارة أو بحساب
     موظف بصفة مدير) والموظف: إدارتهم وحدها؛ مدير الإدارة العامة: إدارات
     مجموعته؛ مدير النظام: الكل. يُطبَّق عند التحميل وعلى كل تفعيل لاحق. */
  /* → للأجزاء الأخرى */
  I.u0 = u0;
})();
