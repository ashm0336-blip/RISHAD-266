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
      dropEmpTpl = I.dropEmpTpl, effCap = I.effCap, empLens = I.empLens, empPagePerms = I.empPagePerms, empPerms = I.empPerms, empTpl = I.empTpl,
      expandPerms = I.expandPerms, freezeStaff = I.freezeStaff, gmDepts = I.gmDepts, gmKeyOf = I.gmKeyOf, gmRoleLabel = I.gmRoleLabel,
      groupManagerPub = I.groupManagerPub, groupManagersPub = I.groupManagersPub, hasCap = I.hasCap, hasOwnSheet = I.hasOwnSheet, hashPw = I.hashPw,
      isContainer = I.isContainer, isGmKey = I.isGmKey, isMgrKey = I.isMgrKey, isSuper = I.isSuper, leafKeysOf = I.leafKeysOf, leafReg = I.leafReg,
      login = I.login, mgrKeyOf = I.mgrKeyOf, navOrder = I.navOrder, needsPwChange = I.needsPwChange, onAny = I.onAny, onCap = I.onCap,
      orderRows = I.orderRows, p24AfterTpl = I.p24AfterTpl, p24Apply = I.p24Apply, p24Assignable = I.p24Assignable, p24Ceil = I.p24Ceil,
      p24Cover = I.p24Cover, p24Delta = I.p24Delta, p24Effective = I.p24Effective, p24GrantOf = I.p24GrantOf, p24Grantable = I.p24Grantable,
      p24Ix = I.p24Ix, p24KeyOn = I.p24KeyOn, p24LeafOn = I.p24LeafOn, p24LensHosted = I.p24LensHosted, p24LensOf = I.p24LensOf, p24R = I.p24R,
      p24SetGrant = I.p24SetGrant, p24Translate = I.p24Translate,
      patternSeed = I.patternSeed, pinRole = I.pinRole,
      pruneDeptAccounts = I.pruneDeptAccounts, pruneOrphanEmpPerms = I.pruneOrphanEmpPerms, pubUsers = I.pubUsers,
      purgeDeptAccounts = I.purgeDeptAccounts, pwCheck = I.pwCheck, pwRuleText = I.pwRuleText, rawCap = I.rawCap, rawUsers = I.rawUsers,
      removeBackupSuper = I.removeBackupSuper, removeDeptManager = I.removeDeptManager,
      removeGroupManager = I.removeGroupManager, removeStaffAccount = I.removeStaffAccount, roleTitle = I.roleTitle, seedCapFrom = I.seedCapFrom,
      setDeptCap = I.setDeptCap, setDeptLenses = I.setDeptLenses, setDeptManager = I.setDeptManager, setDeptManagerDis = I.setDeptManagerDis,
      setDeptSubs = I.setDeptSubs, setDeptTabs = I.setDeptTabs, setEmpLens = I.setEmpLens, setEmpPerms = I.setEmpPerms, setEmpTpl = I.setEmpTpl,
      setGroupManager = I.setGroupManager, setGroupManagerDis = I.setGroupManagerDis, setStaffMgr = I.setStaffMgr,
      setSuperAccount = I.setSuperAccount, siteMap = I.siteMap, splitLeaf = I.splitLeaf, staffIsMgr = I.staffIsMgr, staffMap = I.staffMap,
      staffStatus = I.staffStatus, subKeysOf = I.subKeysOf, subOn = I.subOn, tabKeysOf = I.tabKeysOf, tabOn = I.tabOn, taken = I.taken,
      unCheck = I.unCheck, upsertBackupSuper = I.upsertBackupSuper, visiblePages = I.visiblePages,
      writeUsers = I.writeUsers;
  /* ═══ شجرة صلاحيات الموظف — نموذج عرضٍ واحد للواجهتين (مدير النظام ومدير الإدارة) ═══
     الحاوية بلا تأشير: نقطة خضراء تُشتق من أوراقها. الورقة: مربعٌ ثلاثي الحالة (✓ الستة · – جزئي · فارغ)
     وأفعالها الستة. ما هو خارج سقف الإدارة يُعرض باهتاً مقفلاً. */
  var ACT_NAMES = { view:'عرض', add:'إضافة', edit:'تعديل', del:'حذف', approve:'اعتماد', export:'تصدير' };
  function treeModel(o){
    o = o || {};
    var d = o.did || curDept(), cap = deptCap(d), draft = o.draft || {}, canEdit = !!o.canEdit, exp = o.expanded || {}, cb = o.cb || {};
    /* hideOut: شجرة موظف داخل الإدارة — ما هو خارج سقفها لا يُعرض أصلاً (لا يُمنح ولا يُوصل إليه)؛ شجرة السقف نفسها تعرض الكل */
    var hideOut = !!o.hideOut;
    var G = '#b99751', G2 = '#8A6F35', T = '#0e7490';
    var rows = [], nOnTot = 0, nTot = 0;
    function leafRow(key, name, child, out){
      var acts = draft[key] || [], all = acts.length === ALL_ACTS.length, some = acts.length > 0 && !all, on = acts.length > 0;
      var dis = out || !canEdit;
      if (!out) { nTot++; if (on) nOnTot++; }
      return { kind:'leaf', isLeaf:true, isCont:false, key:key, name:name, child:!!child, on:on, out:!!out, all:all, some:some,
        rowStyle: 'display:flex;align-items:center;gap:9px;padding:8px 12px;border-bottom:1px solid var(--bd-xf1f3f5);' + (on ? '' : 'background:var(--bg-a2502512520p6);') + (out ? 'opacity:.5;' : ''),
        chkStyle: 'width:20px;height:20px;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:' + (dis ? 'default' : 'pointer') + ';border:2px solid ' + (all || some ? G : 'var(--bd-xcbd5e1)') + ';background:' + (all ? G : 'var(--bg-xffffff)') + ';color:' + (all ? 'var(--fg-xffffff)' : G) + (out ? ';opacity:.35' : ''),
        chkTip: out ? 'خارج سقف الإدارة' : (on ? 'إلغاء كل الأفعال' : 'منحُ العرض وحده — ثم اختر باقي الأفعال صراحةً'),
        nameStyle: 'min-width:0;font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:' + (dis ? 'default' : 'pointer') + ';color:' + (on ? 'var(--fg-x141414)' : 'var(--fg-x94a3b8)'),
        toggle: function(ev){ if (ev && ev.stopPropagation) ev.stopPropagation(); if (dis || !cb.togLeaf) return; cb.togLeaf(key, !on); },   /* V7 P3: فارغ → العرض وحده · ✓ أو – → لا شيء */
        acts: ALL_ACTS.map(function(a){
          var onA = acts.indexOf(a) !== -1;
          return { k:a, name:ACT_NAMES[a], on:onA,
            toggle: function(){ if (dis || !cb.togAct) return; cb.togAct(key, a); },
            style: 'display:inline-flex;align-items:center;gap:4px;border-radius:9999px;padding:3px 9px;font-size:10.5px;font-weight:600;font-family:\'Cairo\',sans-serif;white-space:nowrap;cursor:' + (dis ? 'default' : 'pointer') + ';border:1px solid ' + (onA ? 'rgba(14,116,144,0.4);background:var(--bg-a141161440p07);color:' + T : '#e2e8f0;background:var(--bg-xffffff);color:var(--fg-x53565a)') + (out ? ';opacity:.35' : ''),
            box: 'width:12px;height:12px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid ' + (onA ? T + ';background:' + T + ';color:var(--fg-xffffff)' : '#CBD5E1;background:var(--bg-xffffff);color:transparent') };
        }) };
    }
    function contRow(p, kids, out){
      var nOn = kids.filter(function(k){ return k.on; }).length, on = nOn > 0, isX = !!exp[p.key];
      return { kind:'cont', isCont:true, isLeaf:false, key:p.key, name:p.name, on:on, out:!!out, nOn:nOn, nTot:kids.length, expanded:isX, countTxt: nOn + ' من ' + KIVO.BassamCount(kids.length, "صفحة", "g"),
        rowStyle: 'display:flex;align-items:center;gap:9px;padding:10px 12px;border-bottom:1px solid var(--bd-xf1f3f5);cursor:pointer;' + (on ? '' : 'background:var(--bg-a2502512520p6);') + (out ? 'opacity:.5;' : ''),
        iconStyle: 'width:20px;height:20px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:' + (on ? 'var(--bg-a185151810p14)' : 'var(--bg-xf1f3f5)') + ';color:' + (on ? G2 : 'var(--fg-xb8c0cc)'),
        nameStyle: 'min-width:0;font-size:12.5px;font-weight:700;white-space:nowrap;color:' + (on ? 'var(--fg-x141414)' : 'var(--fg-x94a3b8)'),
        dotStyle: 'width:8px;height:8px;border-radius:50%;flex-shrink:0;background:' + (on ? 'var(--bg-x059669)' : 'var(--bg-xcbd5e1)') + (on ? ';box-shadow:0 0 0 3px rgba(5,150,105,0.15)' : ''),
        dotTip: on ? 'تظهر في القائمة الجانبية للموظف' : 'مخفية من قائمته — لم تُمنح صفحة تحتها',
        expStyle: 'width:24px;height:24px;border-radius:7px;border:1px solid ' + (isX ? 'var(--bd-a185151810p4)' : 'var(--bd-xe1e1e1)') + ';background:var(--bg-xffffff);color:' + (isX ? G2 : 'var(--fg-x94a3b8)') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer',
        chev: 'transition:transform .2s;' + (isX ? 'transform:rotate(180deg)' : ''),
        expTip: isX ? 'طيّ «' + p.name + '»' : 'فرد «' + p.name + '» وعرض صفحاتها',
        expand: function(ev){ if (ev && ev.stopPropagation) ev.stopPropagation(); if (cb.expand) cb.expand(p.key); } };
    }
    var subs = {}, tabs = {};
    /* ── أوراقُ حاويات العرض تُجمع تحتها في الشجرة ───────────────────────────
       «مؤشرات الإدارة» تجمع ستّ لوحاتٍ من أربع صفحات. فتُعرض هنا صفاً واحداً
       تحته أوراقُها، وتُرفع من صفحاتها الأصلية كي لا تُعرض الورقة مرّتين.
       ومفاتيحها لا تتغيّر: daily/kpiOcc تبقى daily/kpiOcc في المنح والحفظ. */
    var GRP = {}, GRP_REG = [], GRPO = {};
    NAV_REG.forEach(function(g){ (g.refs || []).forEach(function(k){ GRP[k] = g.key; GRPO[k] = g; }); GRP_REG.push(g); });
    var grpKids = {};
    PAGE_REG.forEach(function(p){ if (p.under) return;
      /* الحاوية خارج السقف فقط إن كان مفتاحها خارجه ولم تكن تحتها صفحةٌ مستقلة داخله — «المهام» تحت «المتابعة اليومية» لها مفتاحها هي */
      var outP = cap.indexOf(p.key) === -1;
      var out = outP && !PAGE_REG.some(function(q){ return q.under === p.key && cap.indexOf(q.key) !== -1; });
      if (hideOut && out) return;
      if (!isContainer(p.key)) { rows.push(leafRow(p.key, p.name, false, out)); return; }
      var ds = deptSubs(d, p.key), dt = deptTabs(d, p.key), kids = [];
      var seq = p.seq || [].concat((p.subs || []).map(function(x){ return 'sub:' + x.key; }), (p.tabs || []).map(function(x){ return 'tab:' + x.key; }), PAGE_REG.filter(function(q){ return q.under === p.key; }).map(function(q){ return 'page:' + q.key; }));
      seq.forEach(function(e){ var t = e.split(':'), kind = t[0], k = t[1];
        if (kind === 'page') { var q = PAGE_OF[k]; if (q) { var qOut = cap.indexOf(q.key) === -1; if (hideOut && qOut) return; kids.push(leafRow(q.key, q.name, true, qOut)); } return; }
        var reg = kind === 'sub' ? (p.subs || []) : (p.tabs || []); var x = reg.filter(function(z){ return z.key === k; })[0]; if (!x) return;
        var onDept = (kind === 'sub' ? ds : dt).indexOf(k) !== -1;
        if (hideOut && (outP || !onDept)) return;
        /* ورقةٌ تنتمي لحاويةِ عرضٍ: تُدفع إليها لا إلى صفحتها */
        var gk9 = GRP[p.key + '/' + k];
        if (gk9) { var g9 = GRPO[p.key + '/' + k], nm9 = (g9 && g9.names && g9.names[p.key + '/' + k]) || x.name;
          (grpKids[gk9] = grpKids[gk9] || []).push(leafRow(p.key + '/' + k, nm9, true, outP || !onDept)); return; }
        kids.push(leafRow(p.key + '/' + k, x.name, true, outP || !onDept));
      });
      if (hideOut && !kids.length) return;
      var c = contRow(p, kids, out); rows.push(c); if (c.expanded) kids.forEach(function(k){ rows.push(k); });
    });
    /* صفُّ الحاوية وأوراقُها — بعد الصفحات، وبالمكوّن نفسه */
    GRP_REG.forEach(function(g){
      var ord9 = g.refs || [], kids = (grpKids[g.key] || []).slice().sort(function(x, y){ return ord9.indexOf(x.key) - ord9.indexOf(y.key); });
      if (!kids.length) return;
      var c = contRow({ key:g.key, name:g.name }, kids, false);
      rows.push(c); if (c.expanded) kids.forEach(function(k){ rows.push(k); });
    });
    /* العدسات */
    var dl = deptLenses(d), lens = Array.isArray(o.lens) ? o.lens : dl.slice();
    var lensRows = LENS_REG.map(function(L){ var inCap = dl.indexOf(L.key) !== -1, on = inCap && lens.indexOf(L.key) !== -1, dis = !inCap || !canEdit;
      return { key:L.key, name:L.name, on:on, out:!inCap, toggle: function(){ if (dis || !cb.togLens) return; cb.togLens(L.key); },
        style: 'display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:9999px;font-size:11px;font-weight:600;font-family:\'Cairo\',sans-serif;cursor:' + (dis ? 'default' : 'pointer') + ';border:1px solid ' + (on ? 'rgba(14,116,144,0.45);background:var(--bg-a141161440p07);color:' + T : '#e2e8f0;background:var(--bg-xffffff);color:var(--fg-x94a3b8)') + (inCap ? '' : ';opacity:.4'),
        box: 'width:12px;height:12px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;border:2px solid ' + (on ? T + ';background:' + T + ';color:var(--fg-xffffff)' : '#CBD5E1;background:var(--bg-xffffff);color:transparent') }; });
    if (hideOut) lensRows = lensRows.filter(function(x){ return !x.out; });
    rows = orderRows(rows);   /* ترتيب القائمة الجانبية نفسه + رؤوس المجموعات + وسم المطفأ */
    return { rows: rows, lensRows: lensRows, lensOnN: lensRows.filter(function(x){ return x.on; }).length, lensTot: dl.length, pagesOn: nOnTot, pagesTot: nTot, capEmpty: cap.length === 0,
      allExpanded: PAGE_REG.filter(function(p){ return !p.under && isContainer(p.key); }).every(function(p){ return !!exp[p.key]; })
        && NAV_REG.every(function(g){ return !!exp[g.key]; }) };
  }
  /* اسم مفتاح صلاحية — صفحة أو ورقة «pk/sk» */
  function nameOf(key){
    var sp = splitLeaf(key), p = PAGE_OF[sp.page]; if (!p) return key;
    if (!sp.sub) return p.name;
    var x = (p.subs || []).concat(p.tabs || []).filter(function(z){ return z.key === sp.sub; })[0];
    return p.name + ' · ' + (x ? x.name : sp.sub);
  }
  /* تبديل فعلٍ في ورقة مع قاعدة «العرض شرط الباقي» */
  function togActIn(draft, key, a){
    var d2 = JSON.parse(JSON.stringify(draft || {})); var cur9 = (d2[key] || []).slice();
    if (cur9.indexOf(a) !== -1) { cur9 = cur9.filter(function(x){ return x !== a; }); if (a === 'view') cur9 = []; }
    else { cur9.push(a); if (cur9.indexOf('view') === -1) cur9.push('view'); }
    if (cur9.length) d2[key] = ALL_ACTS.filter(function(x){ return cur9.indexOf(x) !== -1; }); else delete d2[key];
    return d2;
  }
  /* ═══ V7 P3 · المحرّر الموحّد — قواعدُ المنح ومراجعةُ الفرق لكل نقاط الدخول (نافذةُ الحساب · قوالبُ الإدارة · الجدولُ الشهري ·
     التقريرُ اليومي) بلا مخزنٍ ولا معالجِ تفويضٍ جديد: الكتابةُ بالدوال نفسِها (setEmpPerms · setEmpTpl · setEmpLens · p24.setGrant).
     القاعدة: المنحُ الجديد لورقةٍ يبدأ بالعرض وحده، وبقيةُ الأفعال تُختار صراحةً. وما خُزِّن قبلُ يُعرض ويُحفظ كما هو — لا يُعاد تفسيرُه
     ولا يُضيَّق ولا يُوسَّع. (كان مربّعُ الورقة يمنح الأفعال الستة دفعةً واحدة «ثم ألغِ ما لا تريده».) ═══ */
  function togLeafIn(draft, key, on){
    var d2 = JSON.parse(JSON.stringify(draft || {}));
    if (!on) delete d2[key];
    else if (!(d2[key] || []).length) d2[key] = ['view'];   /* منحٌ جديد: العرضُ وحده */
    return d2;
  }
  /* «تحديد الكل»: العرضُ وحده لكل ورقةٍ بلا منح، وما مُنح قبلُ يبقى كما هو */
  function viewAllIn(draft, keys){
    var d2 = JSON.parse(JSON.stringify(draft || {}));
    (keys || []).forEach(function(k){ if (!(d2[k] || []).length) d2[k] = ['view']; });
    return d2;
  }
  /* الفرقُ قبل الحفظ: ما سيُضاف وما سيُسحب، ورقةً ورقة وفعلاً فعلاً — بالأسماء المعروضة */
  function sheetDiff(base, draft){
    var add = [], drop = [], seen = {};
    Object.keys(base || {}).concat(Object.keys(draft || {})).forEach(function(k){
      if (seen[k]) return; seen[k] = 1;
      var b = (base || {})[k] || [], d = (draft || {})[k] || [];
      var plus = ALL_ACTS.filter(function(a){ return d.indexOf(a) !== -1 && b.indexOf(a) === -1; }),
          minus = ALL_ACTS.filter(function(a){ return b.indexOf(a) !== -1 && d.indexOf(a) === -1; });
      var nm = nameOf(k), an = function(L){ return L.map(function(a){ return ACT_NAMES[a] || a; }); };
      if (plus.length) add.push({ key:k, name:nm, acts:an(plus), whole:!b.length });
      if (minus.length) drop.push({ key:k, name:nm, acts:an(minus), whole:!d.length });
    });
    return { add: add, drop: drop, n: add.length + drop.length };
  }
  /* وضعُ الإنفاذ: الفرقُ مفتاحاً مفتاحاً بأسماء السجلّ */
  function keyDiff(base, draft){
    var R = p24R(), lab = function(k){ return (R && R.byKey[k] && R.byKey[k].label) || k; }, add = [], drop = [], seen = {};
    Object.keys(base || {}).concat(Object.keys(draft || {})).forEach(function(k){
      if (seen[k]) return; seen[k] = 1;
      var b = !!(base || {})[k], d = !!(draft || {})[k];
      if (d && !b) add.push({ key:k, name:lab(k) }); else if (b && !d) drop.push({ key:k, name:lab(k) });
    });
    return { add: add, drop: drop, n: add.length + drop.length };
  }
  /* مفتاحُ العرض الأوّل للمالك (access/view بترتيب السجلّ — نظيرُ «العرض» في الورقة القديمة): المنحُ الجديد لورقةٍ على شجرة v24.9 يبدأ به وحده */
  function p24PrimView(owner, keys){
    var R = p24R(); if (!R) return '';
    var ks = keys || R.byOwner[owner] || [];
    for (var i = 0; i < ks.length; i++) { var e = R.byKey[ks[i]]; if (e && e.status === 'active' && e.owner === owner && (e.type === 'access' || e.type === 'view')) return ks[i]; }
    return '';
  }
  /* منحُ قالبٍ (أو سحبُ المنح بلا قالب) — المعالجُ الواحد لنقاط الدخول كلها. خياراتُ كل نقطةٍ تحفظ سلوكَها القائم كما هو:
     lens: تُضبط عدساتُ الموظف من القالب (الجدولُ الشهري فرداً) · refuseEmpty: قالبٌ بلا ورقةٍ داخل السقف لا يُمنح */
  function grantTpl(ekey, tp, did, opt){
    opt = opt || {};
    if (!ekey) return { ok:false, err:'حسابٌ بلا مفتاح موظف' };
    var d = isSuper() ? (did || curDept()) : curDept(), cut = tp ? tplCut(tp.perms || {}, d) : {};
    var empty = !!tp && !Object.keys(cut).some(function(k){ return (cut[k] || []).length; });
    if (empty && opt.refuseEmpty) return { ok:false, empty:true, err:'القالب «' + (tp.name || '') + '» بلا أوراق داخل سقف الإدارة' };
    var r = setEmpPerms(ekey, cut, d); if (r && r.ok === false) return r;
    if (opt.strict) setEmpTpl(ekey, tp ? tp.id : '', d); else try { setEmpTpl(ekey, tp ? tp.id : '', d); } catch(e){}   /* strict: عطلُه يُرفع للنداء (grantTplByName كما كان) */
    if (opt.lens) try { var dl = deptLenses(d) || []; setEmpLens(ekey, tp && Array.isArray(tp.lens) ? tp.lens.filter(function(k){ return dl.indexOf(k) !== -1; }) : dl, d); } catch(e){}
    return { ok:true, cut:cut, empty:empty, id: tp ? tp.id : '', name: tp ? tp.name : '' };
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
    bassam_shift_options_v1:'admin/shifts', bassam_perm_tpls_v1:'admin/ptpls',
    bassam_plan_v1:'plan', bassam_zone_opts_v1:'plan', bassam_gate_opts_v1:'plan', bassam_mark_kinds_v1:'plan',
    bassam_rounds_v1:'daily/rounds', bassam_dreport_v1:'dreport', bassam_dr_grp_v1:'dreport', bassam_leave_kinds_v1:'dreport',
    bassam_tasks_v1:'tasks', bassam_tasks_locks_v1:'tasks',
    bassam_irshad_v1:'irshad', bassam_irshad_langs_v1:'irshad', bassam_irshad_locs_v1:'irshad',
    bassam_seized_v1:'seized', bassam_seized_cat_v1:'seized', bassam_seized_acts_v1:'seized', bassam_seized_locs_v1:'seized', bassam_seized_jew_v1:'seized',
    bassam_award_v1:'award', bassam_award_docs_v1:'award', bassam_award_docs_v2:'award' };
  function keyCap(k){ var b = String(k || '').replace(/^bsdept:[^:]+:/, '').replace(/:.*$/, ''); return KEY_CAP[b] || ''; }
  function keyOn(k, did){ try { var c = keyCap(k); return c ? onCap(c, did) : true; } catch (e) { return true; } }
  /* R188: «هل يملك المستخدمُ الحاليُّ الكتابةَ في هذا المورد؟» — من ورقته (keyCap) وأفعاله. تُسأل قبل أي كتابةٍ
     لا يطلبها المستخدم (ترحيلٌ عند الفتح · إنشاءٌ تلقائيّ) فلا تُرسل كتابةٌ يرفضها الخادم ويُعيدها برسالةٍ حمراء */
  function canW(k, act){ try { var c = keyCap(k); if (!c) return true; return can(c, act || 'edit'); } catch (e) { return true; } }

  /* ═══ أسماء القوالب المعتمدة (بطلب المستخدم): المسميات فقط تتغيّر، وأوراق كل قالب تبقى كما هي ═══
     القديم: «مدير إدارة كامل» ← «رئيسـ / ـة الوردية» · «مشغّل ميداني» ← «نائبـ/ ـة رئيس الوردية» · «مشاهد فقط» ← «مراقبـ / ـة»
     ويُضاف «إداريـ / ـة» و«ميدانيـ / ـة» بلا أوراق. الترتيب: رئيس · نائب · مراقب · إداري · ميداني — ثم ما سواها.
     تُطبَّق لمرةٍ واحدة على قائمة كل إدارة (علامة في مخزنها) ولا تمسّ قالباً سبق أن أُعيدت تسميته يدوياً. */
  var TPL_NAMES_FLAG = 'bassam_perm_tpls_named_v1';
  var TPL_RENAME = { mgr: 'رئيسـ / ـة الوردية', field: 'نائبـ/ ـة رئيس الوردية', view: 'مراقبـ / ـة' };
  var TPL_LEGACY = { mgr: 'مدير إدارة كامل', field: 'مشغّل ميداني', view: 'مشاهد فقط' };
  var TPL_ORDER = ['رئيسـ / ـة الوردية', 'نائبـ/ ـة رئيس الوردية', 'مراقبـ / ـة', 'إداريـ / ـة', 'ميدانيـ / ـة'];
  function tplsMigrate(list){
    try {
      if (!Array.isArray(list)) return list;
      if (localStorage.getItem(TPL_NAMES_FLAG)) return list;
      var out = list.map(function(t){ if (!t) return t; var nn = TPL_RENAME[t.id]; return (nn && t.name === TPL_LEGACY[t.id]) ? Object.assign({}, t, { name: nn }) : t; });
      var have = {}; out.forEach(function(t){ if (t && t.name) have[t.name] = 1; });
      TPL_ORDER.forEach(function(n){ if (!have[n]) out.push({ id: 't' + Date.now().toString(36) + Math.floor(1e4 * Math.random()).toString(36), name: n, perms: {} }); });
      var rank = function(t){ var i = TPL_ORDER.indexOf(t && t.name); return i === -1 ? 99 : i; };
      out = out.map(function(t, i){ return { t: t, i: i }; }).sort(function(a, b){ return rank(a.t) - rank(b.t) || a.i - b.i; }).map(function(x){ return x.t; });
      localStorage.setItem('bassam_perm_tpls_v1', JSON.stringify(out));
      localStorage.setItem(TPL_NAMES_FLAG, '1');
      return out;
    } catch (e) { return list; }
  }
  /* R180: أوراقُ حاوية العرض من سجلّها — كلُّ ورقةٍ تُضاف إلى refs تدخل حارسَ الرابط والتنقّل تلقائياً */
  function navLeaves(key){ var g = NAV_REG.filter(function(x){ return x.key === key; })[0];
    return g ? (g.refs || []).map(function(r){ var sp = splitLeaf(r); return [sp.page, sp.sub]; }) : []; }
  /* KIVO_261 · SOT-003/010 (كشفه k261tree): هل تُرسم لوحةُ «مؤشرات الإدارة» هذه للمستخدم؟ — الورقةُ ∧ شروطُ اللوحة نفسُها (كانت في وحدة المؤشرات وحدها،
     فمن مُنح «مؤشرات التشغيل اليومي» دون «التقرير اليومي» يرى رابطَ «مؤشرات الإدارة» إلى صفحةٍ تقول «لا مؤشرات ممنوحة لك»). مصدرٌ واحد للرابط والصفحة. */
  function kpiPanelOk(pk, sk){
    try {
      if (!sk) return can(pk, 'view');   /* V7 P4 · G6: لوحةُ صفحةٍ كاملة (مرجعٌ بلا «/» في refs — «مؤشرات المهام») يمنحها مفتاحُ عرض الصفحة نفسُه */
      if (!canSub(pk, sk, 'view')) return false;
      if (sk === 'kpiOcc') return onCap('zones') && onCap('dens');
      if (sk === 'kpiZones') return onCap('zones');
      if (sk === 'kpiDaily') return can('dreport', 'view');
      return true;
    } catch (e) { return false; }   /* KIVO_261 (المراجعةُ المستقلة): العطلُ يُخفي (كما كان فحصُ الرابط في الغلاف) لا يُظهر */
  }
  KIVO.BassamPerm = { keyCap: keyCap, keyOn: keyOn, canW: canW, navOrder: navOrder, orderRows: orderRows, siteMap: siteMap, PAGE_KEYS: PAGE_KEYS, PAGE_REG: PAGE_REG, NAV_REG: NAV_REG, NAV2PERM: NAV2PERM, PERM2NAV: PERM2NAV, ALL_ACTS: ALL_ACTS, deptAccountsCount: deptAccountsCount, purgeDeptAccounts: purgeDeptAccounts, deptCap: deptCap, setDeptCap: setDeptCap, rawCap: rawCap, hasCap: hasCap, effCap: effCap, seedCapFrom: seedCapFrom, seedSectionCap: I.seedSectionCap, dropNodeCap: I.dropNodeCap, capOrphans: I.capOrphans,    patternSeed: patternSeed, _bust: function(){ I._pmMemo = null; },
    on: onCap, onAny: onAny, capSetAnywhere: capSetAnywhere, capState: I.capState, capOwnOf: I.capOwnOf, setCapOwn: I.setCapOwn, latentLeaves: I.latentLeaves, LENS_KEYS: LENS_KEYS, LENS_REG: LENS_REG, deptLenses: deptLenses, setDeptLenses: setDeptLenses, lensOn: I.lensOn,
    PAGE_OF: PAGE_OF, subKeysOf: subKeysOf, deptSubs: deptSubs, setDeptSubs: setDeptSubs, subOn: subOn,
    tabKeysOf: tabKeysOf, deptTabs: deptTabs, setDeptTabs: setDeptTabs, tabOn: tabOn,
    empPerms: empPerms, setEmpPerms: setEmpPerms, clearEmpPerms: clearEmpPerms, empPagePerms: empPagePerms, capAllPerms: capAllPerms, hasOwnSheet: hasOwnSheet,
    isContainer: isContainer, leafKeysOf: leafKeysOf, leafReg: leafReg, splitLeaf: splitLeaf, expandPerms: expandPerms, derivePages: derivePages, canSub: canSub,
    empLens: empLens, setEmpLens: setEmpLens, treeModel: treeModel, nameOf: nameOf, togActIn: togActIn, togLeafIn: togLeafIn, ACT_NAMES: ACT_NAMES,
    viewAllIn: viewAllIn, sheetDiff: sheetDiff, keyDiff: keyDiff, grantTpl: grantTpl,   /* V7 P3 · المحرّر الموحّد */
    empTpl: empTpl, setEmpTpl: setEmpTpl, dropEmpTpl: dropEmpTpl,
    tplCut: tplCut, tplSig: tplSig, permSig: permSig, grantTplByName: grantTplByName, tplsMigrate: tplsMigrate,
    tplsList: tplsList, grantSig: grantSig, tplOfEmp: tplOfEmp, tplHolders: tplHolders,
    dropEmpPerms: dropEmpPerms, pruneOrphanEmpPerms: pruneOrphanEmpPerms,
    myPerms: I.myPerms, can: can, visiblePages: visiblePages, navLeaves: navLeaves, kpiPanelOk: kpiPanelOk,
    key: azKey, authz: function(){ return azZ(); },
    p24: { R: p24R, ix: p24Ix, ceil: p24Ceil, leafOn: p24LeafOn, keyOn: p24KeyOn, lensHosted: p24LensHosted, translate: p24Translate, grantOf: p24GrantOf, grantable: p24Grantable, assignable: p24Assignable, effective: p24Effective, delta: p24Delta, cover: p24Cover, setGrant: p24SetGrant, apply: p24Apply, afterTpl: p24AfterTpl, lensOf: p24LensOf, DERIVE: P24_DERIVE, primView: p24PrimView } };

  /* ═══ الطاقم الإشرافي — من لا يُسكَّن على المواقع ═══
     المعيار قالب الصلاحية الموسوم (سواء مُنح من الجدول الشهري أو التقرير اليومي)،
     والافتراضي للقوالب القديمة يُستنتج من اسمها حتى يُوسم صراحةً. */
  (function(){
    var NAME_RX = /رئيس|نائب|إداري|اداري|مراقب/;
    function tpls(){ try { var v = JSON.parse(localStorage.getItem('bassam_perm_tpls_v1')); return Array.isArray(v) ? v : []; } catch(e){ return []; } }
    function isSupTpl(tp){ if (!tp) return false; if (tp.sup === true) return true; if (tp.sup === false) return false; return NAME_RX.test(String(tp.name || '')); }
    function norm(o){ return Object.keys(o || {}).filter(function(k){ return (o[k] || []).length; }).sort().map(function(k){ return k + ':' + (o[k] || []).slice().sort().join(','); }).join('|'); }
    /* قالب الموظف: الهوية المحفوظة أولاً ثم بصمة الصفحات — كما في الجدول الشهري والتقرير اليومي */
    function tplOf(ekey){
      var PM = KIVO.BassamPerm; if (!PM || !ekey || !PM.tplOfEmp) return null;
      var id = ''; try { id = PM.tplOfEmp(ekey) || ''; } catch(e){}   /* R182: المصدرُ الواحد */
      if (!id) return null;
      var L = tpls(); for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
      return null;
    }
    function isSup(ekey){ return isSupTpl(tplOf(ekey)); }
    function supName(ekey){ var tp = tplOf(ekey); return (tp && isSupTpl(tp)) ? (tp.name || '') : ''; }
    KIVO.BassamSup = { tpls: tpls, isSupTpl: isSupTpl, tplOf: tplOf, isSup: isSup, supName: supName };
  })();

  /* ═══ مفتاح الاختيار الموحّد: ＋ للفارغ ونصٌّ منقّط للمختار ═══ */
  KIVO.BassamPick = {
    txt: function(canEdit, open){ return "display:inline-flex;align-items:center;justify-content:center;gap:6px;max-width:100%;font-size:12px;font-weight:400;font-family:'Cairo',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.6;color:" + (canEdit ? "var(--fg-x141414)" : "var(--fg-x53565a)") + ";" + (canEdit ? ("cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;text-decoration-color:" + (open ? "var(--fg-xb99751)" : "var(--fg-a185151810p55)")) : "cursor:not-allowed;text-decoration:none"); },
    plus: function(canEdit, open){ return "width:22px;height:22px;border-radius:9999px;border:1px dashed " + (canEdit ? "#b99751;color:var(--fg-x9a7e40)" : "#cbd5e1;color:var(--fg-xcbd5e1)") + ";background:" + (open ? "var(--bg-a185151810p12)" : "transparent") + ";font-size:14px;line-height:1;display:inline-flex;align-items:center;justify-content:center;font-family:'Cairo',sans-serif;padding:0;cursor:" + (canEdit ? "pointer" : "not-allowed"); }
  };

  /* ═══ القالب مقصوصاً بسقف الإدارة — نسخةٌ واحدة ═══
     القاعدة: القالب يُقصّ بصفحة الورقة لا بمفتاحها، فـ«daily/field» ورقةٌ تحت
     «daily» ولا تسقط لأن «daily/field» ليست في السقف. كانت هذه السطر مكرّراً في
     سبعة مواضع، فحين صُحّح في ثلاثة بقيت أربعةٌ تمنح قالباً «بلا صفحات».
     tplCut: القالب بعد القصّ · tplSig: بصمته للمقارنة · permSig: بصمة صلاحيات موظف. */
  /* منح قالب بالاسم — نفس مسار منتقي القالب في الجدول الشهري: قصّ بالسقف + تسجيل القالب + عدسات القالب */
  function grantTplByName(ekey, name, did){
    try {
      var nm = String(name || '').trim(); if (!ekey || !nm) return { ok:false, err:'بلا اسم' };
      var d = isSuper() ? (did || curDept()) : curDept();
      var L = []; try { L = JSON.parse(RAW.getItem.call(localStorage, 'bsdept:' + d + ':bassam_perm_tpls_v1')) || []; } catch(e){ L = []; }
      var norm = function(x){ return String(x || '').trim().replace(/\s+/g, ' '); };
      var t = (L || []).filter(function(x){ return norm(x.name) === norm(nm); })[0];
      if (!t) return { ok:false, err:'قالب غير معروف', unknown:true };
      /* قالبٌ بلا ورقة واحدة داخل سقف هذه الإدارة لا يُمنح — منحُه وهمٌ لا يظهر في قائمة الصلاحيات (V7 P3: بالمعالج الواحد grantTpl) */
      var r = grantTpl(ekey, t, d, { lens:true, refuseEmpty:true, strict:true }); if (!r || r.ok === false) return r;
      return { ok:true, id:t.id, name:t.name };
    } catch(e){ return { ok:false, err:'تعذّر المنح' }; }
  }
  function tplCut(perms, did){
    var cap = deptCap(did) || {}, out = {};
    var has = function (p) { return (cap.indexOf ? cap.indexOf(p) !== -1 : !!cap[p]); };
    /* R180: قالبٌ حُفظ يوم كانت الصفحةُ بلا أوراق (مفتاحُ حاويةٍ مثل dstats) يُفرَد إلى أوراقها كما يُفرَد
       عند المنح — فتبقى بصمتُه مطابقةً لمن مُنحه، ولا يتغيّر شيءٌ لقالبٍ أوراقُه صريحة */
    var src = expandPerms(perms || {}, did || curDept());
    Object.keys(src).forEach(function (k) { if (has(String(k).split('/')[0])) out[k] = (src[k] || []).slice(); });
    return out;
  }
  function permSig(perms){
    return Object.keys(perms || {}).filter(function (k) { return (perms[k] || []).length; }).sort()
      .map(function (k) { return k + ':' + (perms[k] || []).slice().sort().join(','); }).join('|');
  }
  function tplSig(perms, did){ return permSig(tplCut(perms, did)); }
  /* ═══ R182: قالبُ الموظف — مصدرٌ واحدٌ لكل الشاشات (الإعدادات · الجدول الشهري · الموظفون · التقرير اليومي · المهام
     · التشغيل الميداني · الطاقم الإشرافي). كان يُحسب في كلٍّ منها بطريقته فتختلف الشاشاتُ في الموظف نفسِه. ═══ */
  function tplsList(did){
    var d = did || curDept(), L = [];
    try { var raw = (RAW && RAW.getItem) ? RAW.getItem.call(localStorage, 'bsdept:' + d + ':bassam_perm_tpls_v1') : localStorage.getItem('bassam_perm_tpls_v1');
      var v = JSON.parse(raw); if (Array.isArray(v)) L = v; } catch(e){}
    /* قراءةٌ فقط — بلا ترحيل (tplsMigrate يكتب في التخزين عند أول قراءة، وللإدارة النشطة وحدها) */
    return L.filter(function(t){ return t && t.id; });
  }
  /* بصمةُ القالب كما يُمنح فعلاً: مفرودٌ ومقصوصٌ بسقف الإدارة وأوراقِها المفعّلة، و«العرضُ شرطُ الباقي» — هي بصمةُ من مُنحه */
  function grantSig(perms, did){ return permSig(cleanLeafPerms(perms || {}, did || curDept())); }
  /* الإسنادُ الصريح أوّلاً (يفصل بين قالبين متطابقي الأوراق)، وإلا القالبُ الذي تطابق بصمتُه صلاحياتِ الموظف؛
     ومن لا صلاحيات له لا قالبَ له */
  function tplOfEmp(ekey, did, L){
    if (!ekey) return '';
    var d = did || curDept(), mine = permSig(empPerms(ekey, d) || {});
    if (!mine) return '';
    L = L || tplsList(d);
    var ex = ''; try { ex = empTpl(ekey, d); } catch(e){}
    if (ex && L.some(function(t){ return t.id === ex; })) return ex;
    for (var i = 0; i < L.length; i++) if (grantSig(L[i].perms, d) === mine) return L[i].id;
    return '';
  }
  function tplHolders(tplId, did){
    var d = did || curDept(), L = tplsList(d), out = [], KE = KIVO.BassamEmp;
    var list = KIVO.__BS_SRV.operations.reference('bsdept:' + d + ':bassam_employees_v1') || [];
    list.forEach(function(x){ if (!x) return; var k = (KE && KE.key) ? KE.key(x) : (x.eid || x.nid || x.name);
      if (k && out.indexOf(k) === -1 && tplOfEmp(k, d, L) === tplId) out.push(k); });
    return out;
  }
  /* وصف صلاحية موظف بكلمة: اسم القالب الممنوح (أو المطابق بعد قصّه بسقف الإدارة)، وإلا عدد الصفحات، وإلا «بلا صلاحيات».
     تُقرأ الصلاحيات تحت أي رمز للموظف (المفتاح الموحّد أو هويته أو اسمه) — لبيانات ما قبل توحيد المفاتيح. */
  function permLabel(ekey, did){
    try {
      var PM = KIVO.BassamPerm; if (!PM || !PM.empPerms || !ekey) return '';
      var toks = [ekey];
      try { var list = KIVO.__BS_SRV.operations.reference('bsdept:' + (did || curDept()) + ':bassam_employees_v1') || []; var KE = KIVO.BassamEmp;
        var e = list.filter(function(x){ return ((KE && KE.key) ? KE.key(x) : (x.eid || x.nid || x.name)) === ekey || x.eid === ekey || x.nid === ekey || x.name === ekey; })[0];
        if (e) [e.eid, e.nid, e.name].forEach(function(t){ if (t && toks.indexOf(t) === -1) toks.push(t); }); } catch(e0){}
      var mineO = {}; for (var i = 0; i < toks.length; i++) { var o = PM.empPerms(toks[i], did) || {}; if (Object.keys(o).some(function(k){ return (o[k] || []).length; })) { mineO = o; break; } }
      var mine = permSig(mineO); if (!mine) return 'بلا صلاحيات';
      var L = []; try { var v = JSON.parse(localStorage.getItem('bassam_perm_tpls_v1')); if (Array.isArray(v)) L = v; } catch(e1){}
      /* R182: قالبُ الموظف من المصدر الواحد (tplOfEmp) — بالرمز الذي وُجدت تحته صلاحياتُه */
      var tk = ekey; for (var q = 0; q < toks.length; q++) { var oq = PM.empPerms(toks[q], did) || {}; if (Object.keys(oq).some(function(k){ return (oq[k] || []).length; })) { tk = toks[q]; break; } }
      var tid = tplOfEmp(tk, did) || (tk !== ekey ? tplOfEmp(ekey, did) : '');
      if (tid) { var TL = tplsList(did), h = TL.filter(function(x){ return x.id === tid; })[0]; if (h) return h.name; }
      var n = Object.keys(mineO).filter(function(k){ return (mineO[k] || []).length; }).length;
      return KIVO.BassamCount(n, 'صفحة');
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
        return { ok:true, pw: tmp };
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
        /* بطلب المستخدم: تحت اسم الموظف صلاحيته (اسم القالب أو عدد صفحاته) لا كلمة «موظف» الثابتة */
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
        var pl2 = ''; try { pl2 = permLabel(u.ekey); } catch(e3){}
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
  I.tplsList = tplsList; I.u0 = u0;
})();
