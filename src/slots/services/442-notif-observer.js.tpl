/* ═══ التنبيهاتُ والتعاميم — المراقب: استنتاجُ الأحداث من فروق المخازن · الفحصُ الدوري · التشغيل ═══
   KIVO_257 · AUD-010: جزءٌ 2/2 من «src/services/440-notifications.js (الـIIFE الثالثة)» السابقة — مقسومةً بالمسؤولية بـtools/split_iife.mjs (tools/split/440-notifications.json)؛
   التبعياتُ بين الأجزاء صريحةٌ هنا وعبر المساحة الداخلية window.__BS_I.notif وحدها. */
(function(){
  var I = KIVO.__BS_I && KIVO.__BS_I.notif; if (!I || I.dead) return;   /* الجزءُ الأول لم يُحمَّل أو خرج مبكّراً ⇒ لا شيءَ بعده — كالـIIFE الواحدة */
  /* ← من الأجزاء السابقة */
  var D=I.D, GO_NAV=I.GO_NAV, J=I.J, KC=I.KC, KI=I.KI, KN=I.KN, LEAVES=I.LEAVES, LV=I.LV, P=I.P, REG=I.REG, TO=I.TO, CH=I.CH,
      ack=I.ack, bcAll=I.bcAll, bcDue=I.bcDue, bcPreviewMe=I.bcPreviewMe, bcRemind=I.bcRemind, bcSend=I.bcSend, bcSendDept=I.bcSendDept, bcStats=I.bcStats,
      bcWithdraw=I.bcWithdraw, bkTime=I.bkTime, cfg=I.cfg, deptName=I.deptName, depts=I.depts, dismiss=I.dismiss, dismissAll=I.dismissAll, emit=I.emit, fill=I.fill,
      goOk=I.goOk, goNav=I.goNav, goKpi=I.goKpi, isMgr=I.isMgr, isSuper=I.isSuper, list=I.list, markAll=I.markAll, markRead=I.markRead, me=I.me, monLbl=I.monLbl, muteGet=I.muteGet,
      muteSet=I.muteSet, myDept=I.myDept, rawGet=I.rawGet, rawSet=I.rawSet, resetCfg=I.resetCfg, setCfg=I.setCfg, typeOf=I.typeOf, types=I.types, unread=I.unread;
  var operationOnce = null, operationEventIndex = 0;
  emit = function(type, detail){
    if (operationOnce) detail = Object.assign({}, detail, { once: operationOnce + ':' + type + ':' + operationEventIndex++ });
    return I.emit(type, detail);
  };
  function operationKey(k){ var service = KIVO.__BS_SRV && KIVO.__BS_SRV.operations; if (!service) throw Error('operations-read-required'); return service.resources.indexOf(unscoped(k)) !== -1; }
  rawGet = function(k){
    if (!operationKey(k)) return I.rawGet(k);
    var key = /^bsdept:/.test(k) ? k : 'bsdept:' + myDept() + ':' + k;
    var value = KIVO.__BS_SRV.operations.reference(key);
    return value == null ? null : JSON.stringify(value);
  };
  /* ═══ المراقب: استنتاج الأحداث من فروق المخازن (في متصفح الفاعل فقط) ═══ */
  var SNAP = {}; var WATCH = {};
  function unscoped(k){ return String(k).replace(/^bsdept:[^:]+:/, ''); }
  function deptOfKey(k){ var m = /^bsdept:([^:]+):/.exec(String(k)); return m ? m[1] : myDept(); }
  function empName(did, ekey){ try { var emps = J(rawGet('bsdept:' + did + ':bassam_employees_v1'), []); var e = (emps || []).filter(function(x){ return (x.eid || x.name) === ekey; })[0]; return e ? e.name : ekey; } catch(e){ return ekey; } }
  function who(){ return (me() || {}).name || 'النظام'; }
  function diffList(a, b, keyOf){ var ma = {}, mb = {}; (a || []).forEach(function(x){ ma[keyOf(x)] = x; }); (b || []).forEach(function(x){ mb[keyOf(x)] = x; }); return { added: Object.keys(mb).filter(function(k){ return !ma[k]; }).map(function(k){ return mb[k]; }), removed: Object.keys(ma).filter(function(k){ return !mb[k]; }).map(function(k){ return ma[k]; }), both: Object.keys(mb).filter(function(k){ return ma[k]; }).map(function(k){ return [ma[k], mb[k]]; }) }; }
  function eq(a, b){ return JSON.stringify(a) === JSON.stringify(b); }

  /* RISHAD-266 · issue #1 (قرارُ المالك): إشعاراتُ الموظفين (emp_add · emp_edit · emp_type · emp_del · emp_delm · emp_imp · emp_wipe) يُصدرها الخادمُ نفسُه عند قبول الحفظ
     (workers/parts/019 nfEmployeePlan — من فرق سجل الموظفين المقبول، في دفعة الحفظ الذرّية نفسِها) ولا يقبلها من المتصفح؛ فلا مراقبَ هنا لسجل الموظفين. */
  WATCH['bassam_auth_users_v1'] = function(did, o, n){
    o = Array.isArray(o) ? o : []; n = Array.isArray(n) ? n : []; var d = diffList(o, n, function(u){ return u.id; });
    var frz = [];
    d.added.forEach(function(u){ if (u.role === 'staff' && u.ekey) emit('acct_on', { dept: u.deptId || did, own: [u.ekey], vars: { 'المستخدم': u.un || '' } }); if (u.role === 'dept' && u.deptId) emit('sy_dept', { dept: u.deptId, vars: { 'الفعل': 'تعيين مدير إدارة', 'الإدارة': deptName(u.deptId), 'التفصيل': u.name || u.un } }); });
    d.both.forEach(function(p){ var a = p[0], b = p[1]; var dd = b.deptId || did;
      if (!!a.dis !== !!b.dis) frz.push([b, b.dis ? 'جُمّد' : 'أُعيد تفعيل']);
      if (!!a.mgr !== !!b.mgr && b.ekey) emit('acct_mgr', { dept: dd, own: [b.ekey], vars: { 'الفعل': b.mgr ? 'عُيّنت' : 'أُلغي تعيينك', 'الإدارة': deptName(dd) } });
      if (a.ph !== b.ph && b.tmp && !a.tmp && b.ekey) emit('acct_pw', { dept: dd, own: [b.ekey], vars: { 'المُعدّل': who() } }); });
    if (frz.length >= 3) emit('acct_bulk', { dept: did, vars: { 'الفعل': frz[0][1], 'العدد': frz.length, 'المُعدّل': who() } });
    else frz.forEach(function(f){ emit('acct_frz', { dept: f[0].deptId || did, vars: { 'الحالة': f[1], 'الاسم': f[0].name || f[0].un, 'المُعدّل': who() } }); });
  };
  WATCH['bassam_perms_v1'] = function(did, o, n){
    o = o || {}; n = n || {}; var oe = o.emps || {}, ne = n.emps || {};
    Object.keys(ne).forEach(function(d){ Object.keys(ne[d] || {}).forEach(function(ek){ var a = (oe[d] || {})[ek] || {}, b = ne[d][ek] || {}; if (eq(a, b)) return;
      var add = Object.keys(b).filter(function(k){ return !a[k]; }), rem = Object.keys(a).filter(function(k){ return !b[k]; }), chg = Object.keys(b).filter(function(k){ return a[k] && !eq(a[k], b[k]); });
      var nm = function(k){ try { return P().nameOf(k); } catch(e){ return k; } };
      var parts = []; if (add.length) parts.push('مُنحت: ' + add.map(nm).join('، ')); if (rem.length) parts.push('سُحبت: ' + rem.map(nm).join('، ')); if (chg.length) parts.push('عُدّلت: ' + chg.map(nm).join('، '));
      if (parts.length) emit('pm_chg', { dept: d, own: [ek], vars: { 'الفعل': '', 'الصفحات': parts.join(' · '), 'المُغيّر': who() } }); }); });
    var oc = o.caps || {}, nc = n.caps || {};
    Object.keys(nc).forEach(function(d){ if (eq(oc[d] || [], nc[d] || [])) return; var nm = function(k){ try { return P().nameOf(k); } catch(e){ return k; } }; var add = (nc[d] || []).filter(function(k){ return (oc[d] || []).indexOf(k) === -1; }), rem = (oc[d] || []).filter(function(k){ return (nc[d] || []).indexOf(k) === -1; }); var parts = []; if (add.length) parts.push('أُضيف ' + add.map(nm).join('، ')); if (rem.length) parts.push('سُحب ' + rem.map(nm).join('، ')); if (parts.length) emit('pm_cap', { dept: d, vars: { 'الفعل': parts.join(' · '), 'الصفحات': '' } }); });
    var ot = o.tplOf || {}, nt = n.tplOf || {};
    Object.keys(nt).forEach(function(d){ Object.keys(nt[d] || {}).forEach(function(ek){ if ((ot[d] || {})[ek] === nt[d][ek] || !nt[d][ek]) return; var L2 = J(rawGet('bsdept:' + d + ':bassam_perm_tpls_v1'), []) || []; var t = (L2 || []).filter(function(x){ return x.id === nt[d][ek]; })[0]; emit('acct_tpl', { dept: d, own: [ek], vars: { 'القالب': t ? t.name : 'قالب صلاحيات', 'العدد': t ? Object.keys(t.perms || {}).length : '' } }); }); });
  };
  /* تعريفات الورديات وقوالب الصلاحيات صارت صفحتين في إعدادات الإدارة — ولكل
     تغييرٍ فيهما حدثه، فلا فعلَ في المنصة بلا مدخلٍ في الشجرة. */
@@SYS:nfo.watch.staff.shdef@@  WATCH['bassam_perm_tpls_v1'] = function(did, o, n){
    o = Array.isArray(o) ? o : []; n = Array.isArray(n) ? n : [];
    if (!o.length && n.length > 1) return;   /* بذر القوالب الافتراضية عند أول فتح ليس فعلَ مستخدم */
    var d = diffList(o, n, function(x){ return x && x.id; });
    var cnt = function(x){ return Object.keys((x && x.perms) || {}).length; };
    d.added.forEach(function(x){ emit('pm_tpl', { dept: did, vars: { 'الفعل': 'أُنشئ', 'القالب': x.name, 'التفصيل': cnt(x) ? (KIVO.BassamCount(cnt(x), "ورقة")) : 'فارغ', 'المُعدّل': who() } }); });
    d.removed.forEach(function(x){ emit('pm_tpl', { dept: did, vars: { 'الفعل': 'حُذف', 'القالب': x.name, 'التفصيل': cnt(x) ? (KIVO.BassamCount(cnt(x), "ورقة")) : 'فارغ', 'المُعدّل': who() } }); });
    d.both.forEach(function(p){ var a = p[0], b = p[1]; if (eq(a, b)) return;
      var ch = []; if ((a.name||'') !== (b.name||'')) ch.push('الاسم «' + (a.name||'') + '» ← «' + (b.name||'') + '»');
      if (!eq(a.perms || {}, b.perms || {})) ch.push('الأوراق ' + cnt(a) + ' ← ' + cnt(b));
      if (!ch.length) return;
      emit('pm_tpl', { dept: did, vars: { 'الفعل': 'عُدّل', 'القالب': b.name, 'التفصيل': ch.join(' · '), 'المُعدّل': who() } }); });
  };
  /* الجدول الشهري تخطيطٌ بين مدير الإدارة ورؤساء الورديات — تنبيهاته لهم وحدهم، ولا يصل الموظفَ شيء منه؛ تشغيله يبدأ بسحب التقرير اليومي */
  function empName(did, key){ try { var emps = J(rawGet('bsdept:' + did + ':bassam_employees_v1'), []) || []; var e = emps.filter(function(x){ return x.eid === key || x.nid === key || x.name === key; })[0]; return e ? e.name : String(key); } catch(e){ return String(key); } }
@@SYS:nfo.watch.staff@@@@SYS:nfo.watch.tasks@@  // Custody notifications belong to the typed server transaction; no retired KV observer.
@@SYS:nfo.watch.dreport@@  var WD = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  function wdName(day){ /* اسم يوم الأسبوع لتاريخ هجري y-m-d بالتقويم أم القرى */
    try { var p = day.split('-').map(Number); return WD[KIVO.BassamCal.hWeekdayIndex(p[0], p[1], p[2], 400)] || ''; } catch(e){} return '';   /* V7 · د5-د2: البحثُ (±400 يوماً) صار في الخدمة */
  }
  function isRestOn(rest, wdn){ return !!wdn && (rest || []).some(function(r){ return r === wdn || ('ال' + r) === wdn || r === ('ال' + wdn); }); }
  function restBase(did, day, ek){ @@SYS:nfo.restBase.staff|empty="return [];"@@ }
  function pmCount(rep, day, ek){ var mk = day.split('-').slice(0, 2).join('-'); var n = 0; Object.keys(rep || {}).forEach(function(d){ if (d.indexOf(mk + '-') !== 0) return; var sh = (rep[d] || {}).shifts || {}; var hit = false; Object.keys(sh).forEach(function(s2){ ((sh[s2] || {}).roster || []).forEach(function(r){ if (r && r.ekey === ek && r.st === 'pm') hit = true; }); }); if (hit) n++; }); return n; }
  function ekeyByName(did, name){ try { var emps = J(rawGet('bsdept:' + did + ':bassam_employees_v1'), []); var e = (emps || []).filter(function(x){ return x.name === name || x.eid === name || x.nid === name; })[0]; if (!e) return ''; try { var E = KIVO.BassamEmp; if (E && E.key) return E.key(e) || ''; } catch (e2) {} return e.eid || e.nid || e.name || ''; } catch(e){ return ''; } }
  function ekeyOfTok(did, tok){ try { var emps = J(rawGet('bsdept:' + did + ':bassam_employees_v1'), []) || []; var e = emps.filter(function(x){ return x.eid === tok || x.nid === tok || x.name === tok; })[0]; return e ? (e.eid || e.name) : String(tok); } catch(e){ return String(tok); } }
  function elLabel(kind, el){ if (kind === 'zones') return el.code || el.name || 'مصلى'; if (kind === 'marks') return el.label || el.kind || 'معلم'; return el.label || ('باب ' + (el.num || '')); }
  function spotsOf(rec){ /* موقع كل موظف في الجولة: {token: {label, closed}} */
    var out = {}; if (!rec || !Array.isArray(rec.d)) return out;
    rec.d.forEach(function(f){ [['gates', f.gates || []], ['zones', f.zones || []], ['marks', f.marks || []]].forEach(function(pair){ pair[1].forEach(function(el){ if (!el) return; var closed = pair[0] === 'gates' ? !!el.closed : !!el.off; (el.emp || []).forEach(function(t){ out[t] = { label: elLabel(pair[0], el), closed: closed }; }); }); }); });
    return out;
  }
@@SYS:nfo.watch.daily@@@@SYS:nfo.watch.plan@@  // Seized and Award events are issued by their server transaction.
  /* F01: أحداثُ سجلّ الوحدات بنوعها — القسمُ يُنبَّه عنه قسماً تحت إدارته الأم (320 unitEvents) لا «أُنشئت إدارة» */
  WATCH['bassam_depts_v1'] = function(did, o, n){ var D = KIVO.BassamDepts; if (D && D.unitEvents) { D.unitEvents(o, n, who()).forEach(function(e){ emit(e.t, { vars: e.vars }); }); return; } var d = diffList(Array.isArray(o) ? o : [], Array.isArray(n) ? n : [], function(x){ return x.id; }); d.added.forEach(function(x){ emit('sy_dept', { vars: { 'الفعل': 'أُنشئت إدارة', 'الإدارة': x.name, 'التفصيل': '' } }); }); d.removed.forEach(function(x){ emit('sy_ddel', { vars: { 'النوع': 'إدارة', 'الإدارة': x.name, 'المُعدّل': who() } }); }); };
  WATCH['bassam_gdepts_v1'] = function(did, o, n){ var d = diffList(Array.isArray(o) ? o : [], Array.isArray(n) ? n : [], function(x){ return x.id; }); d.added.forEach(function(x){ emit('sy_dept', { vars: { 'الفعل': 'أُنشئت إدارة عامة', 'الإدارة': x.name, 'التفصيل': '' } }); }); d.removed.forEach(function(x){ emit('sy_ddel', { vars: { 'النوع': 'إدارة عامة', 'الإدارة': x.name, 'المُعدّل': who() } }); }); };
  WATCH['bassam_platform_v1'] = function(did, o, n){ o = o || {}; n = n || {}; if (!Object.keys(o).length) return;
    var oo = ((o.mods || {}).off || []), no = ((n.mods || {}).off || []); if (!eq(oo, no)) { var nm = function(k){ try { return (P().PAGE_OF[k] || {}).name || k; } catch(e){ return k; } }; var inCap = function(k, d){ try { var c = P().deptCap ? P().deptCap(d.id) : null; return !c || c.indexOf(k) !== -1; } catch(e){ return true; } }; no.filter(function(k){ return oo.indexOf(k) === -1; }).forEach(function(k){ depts().filter(function(d){ return inCap(k, d); }).forEach(function(d){ emit('sy_mods', { dept: d.id, vars: { 'الفعل': 'أُطفئت', 'الوحدة': nm(k) } }); }); }); oo.filter(function(k){ return no.indexOf(k) === -1; }).forEach(function(k){ depts().filter(function(d){ return inCap(k, d); }).forEach(function(d){ emit('sy_mods', { dept: d.id, vars: { 'الفعل': 'فُعّلت', 'الوحدة': nm(k) } }); }); }); }
    var ch = Object.keys(n).filter(function(k){ return k !== 'mods' && !eq(o[k], n[k]); }); if (ch.length) emit('sy_plat', { vars: { 'التفصيل': ch.map(function(k){ return ({ name:'الاسم', org:'الجهة', logo:'الشعار', login:'شاشة الدخول', side:'القائمة', app:'تطبيق الجوال', about:'حول المنصة', themeDef:'المظهر', print:'الطباعة', top:'الشريط العلوي' })[k] || k; }).join('، ') } }); };
  WATCH['bassam_last_export_v1'] = function(did, o, n){ emit('sy_bk', { vars: { 'الفعل': 'أُنشئت نسخة احتياطية لإدارة ' + deptName(did), 'المُعدّل': who(), 'الحجم': '' } }); };
  WATCH['bassam_last_full_export_v1'] = function(did, o, n){ emit('sy_bk', { vars: { 'الفعل': 'أُنشئت النسخة الشاملة', 'المُعدّل': who(), 'الحجم': '' } }); };

  var _busy = false;
  function onStore(ev){
    try {
      if (!ev || !ev.detail || ev.detail.remote) return;        /* الفاعل وحده يستنتج — التغييرات الواردة لا تولّد مرتين */
      var k = String(ev.detail.key || ''); var u = unscoped(k); var W = WATCH[u]; if (!W || operationKey(k)) return;
      if (_busy) return; _busy = true;
      var prev = SNAP[k]; var next = rawGet(k); SNAP[k] = next;
      if (prev === undefined) { if (String(next || '').length > 6000) { _busy = false; return; } prev = null; }   /* أول كتابة للمفتاح: سجلٌ واحد يُستنتج، وحمولةٌ كبيرة استيرادٌ لا يُنبَّه عنه */
      if (prev === next) { _busy = false; return; }
      if (!me()) { _busy = false; return; }
      try { W(deptOfKey(k), J(prev, null), J(next, null)); } catch(e){}
      I.flushEvents();
    } catch(e){}
    _busy = false;
  }
  function primeAll(){ try { var ks = (D() && D().raw && D().raw.allKeys) ? D().raw.allKeys() : []; ks.forEach(function(k){ if (WATCH[unscoped(k)] && !operationKey(k)) SNAP[k] = rawGet(k); }); } catch(e){} }
  /* الواردة من الخادم تُحدّث اللقطة حتى لا يُعدّ التغيير التالي فرقاً غريباً */
  function onRemote(ev){ try { ((ev.detail && ev.detail.keys) || []).forEach(function(k){ if (WATCH[unscoped(k)] && !operationKey(k)) SNAP[k] = rawGet(k); }); } catch(e){} }
  function onOperationsCommit(ev){
    var data = ev && ev.detail, user = me();
    if (!data || !user || data.uid !== user.id || data.dept !== myDept() || typeof data.requestId !== 'string' || !Array.isArray(data.changes)) return;
    try {
      data.changes.forEach(function(change, index){
        var watch = WATCH[unscoped(change.key)];
        if (!watch || !operationKey(change.key) || deptOfKey(change.key) !== data.dept || change.before === change.after) return;
        operationOnce = 'operations:' + data.requestId + ':' + index; operationEventIndex = 0;
        try { watch(data.dept, J(change.before, null), J(change.after, null)); } finally { operationOnce = null; }
      });
      I.flushEvents();
    } finally { operationOnce = null; }
  }

  /* ═══ الفحص الدوري (المهلات والنصاب والمستودع) — في متصفح المدير/مدير النظام، مرة لكل مهلة ═══ */
  function todayKey(){ try { var h = KIVO.BassamCal.hParts(new Date()); return { y:h.y, m:h.m, d:h.d, key: h.y + '-' + h.m + '-' + h.d }; } catch(e){ var d = new Date(); return { y:d.getFullYear(), m:d.getMonth() + 1, d:d.getDate(), key:'g' + d.toISOString().slice(0, 10) }; } }   /* V7 · د5-د2 */
  /* بدايةُ تشغيل المنصة من الخادم (لمدير النظام وحده): تُقرأ مرةً وتُحفظ في الذاكرة؛ الفشلُ أو الغيابُ يُعاد في الفحص التالي */
  var FIRST = 0, FIRST_P = null;
  function firstAt(){
    if (FIRST) return Promise.resolve(FIRST);
    return FIRST_P || (FIRST_P = fetch('/api/aud?first=1', { credentials: 'same-origin', cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : null; })
      .then(function(j){ FIRST = (j && j.ok && +j.first) || 0; return FIRST; }, function(){ return 0; }).then(function(v){ FIRST_P = null; return v; }));
  }
  function tick(){
    var u = me(); if (!u) return; var did = myDept(); var now = new Date(); var hh = now.getHours(); var T = todayKey();
    if (isMgr() || isSuper()) {
      /* المضبوطات: قطع محفوظة أكثر من 30 يوماً */
      /* المهام: «يقترب موعدها» و«متأخرة» صار يُصدرهما الخادمُ مرةً واحدة لكل صفّ (KIVO_265 · البند 10 — workers/parts/074-task-due.js) ولو لم تكن المنصةُ مفتوحةً عند المسؤول — فلا إصدارَ هنا */
@@SYS:nfo.tick.dreport@@      /* نقص الغد */
@@SYS:nfo.tick.staff@@      /* العهد المتأخرة */
      // No custody history polling on the client; due notices require server support.
      /* ملخص الاسترشاد اليومي 23:30 */
      /* ملخص المستودع الأسبوعي — السبت */
    }
    if (isSuper()) {
      /* نسخة احتياطية قديمة */
      /* لا تنبيه على منصة وُلدت للتوّ: تُقاس الأيام من بداية التشغيل إن لم تُنشأ نسخة قط، ولا تنبيه ما لم توجد بيانات (موظفون) في إدارة ما.
         بدايةُ التشغيل مرجعٌ سحابيّ يقرؤه الخادم (أقدمُ حدثٍ في سجلّ الأنشطة · /api/aud?first=1) — لا كتابةَ عند فتح المنصة (كان المتصفحُ يكتب «أول تشغيل» لكل إدارةٍ نشطة) */
      if (hh >= 8) try { var last = 0; depts().forEach(function(d){ var v = bkTime(rawGet('bsdept:' + d.id + ':bassam_last_export_v1')); if (v > last) last = v; }); var full = Math.max(bkTime(rawGet('bassam_last_full_export_v1')), bkTime(rawGet('bsdept:' + myDept() + ':bassam_last_full_export_v1'))); last = Math.max(last, full);
        var hasData = depts().some(function(d){ var em = J(rawGet('bsdept:' + d.id + ':bassam_employees_v1'), null); return Array.isArray(em) && em.length > 0; });
        var nobk = function(since){ var days = Math.floor((Date.now() - since) / 86400000); if (since && days >= 7) emit('sy_nobk', { vars: { 'الأيام': last ? days : ('بداية التشغيل (' + KIVO.BassamCount(days, "يوم") + ')') }, once: 'nobk:' + T.key }); };
        if (hasData) { if (last) nobk(last); else firstAt().then(nobk); } } catch(e){}
      /* Due broadcast reminders are evaluated and deduplicated by security-poll
         on the server; the browser never writes remDone or a seen document. */
    }
    /* دخول من جهاز جديد: يحكم به الخادم عند الدخول (062a) — لا كتابة من الصفحة ولا ذاكرة متصفح */
    /* المزامنة منقطعة */
    try { if (KIVO.__BS_SRV && KIVO.__BS_SRV.dirty && KIVO.__BS_SRV.dirty() && window.__BS_BOOT && window.__BS_BOOT.cf) { KIVO.__bsDirtySince = KIVO.__bsDirtySince || Date.now(); if (Date.now() - KIVO.__bsDirtySince > 5 * 60000) emit('sy_sync', { dept: did, own: u.ekey ? [u.ekey] : [], vars: { 'المدة': KIVO.BassamCount(Math.round((Date.now() - KIVO.__bsDirtySince) / 60000), "دقيقة") }, once: 'sync:' + T.key + ':' + hh }); } else KIVO.__bsDirtySince = 0; } catch(e){}
  }
  /* Security events and due reminders are projected/deduplicated on the
     server. No shared seen checkpoint or security-log payload lives in Storage. */
  function pollSec(){
    if (!isSuper() || !(window.__BS_BOOT && window.__BS_BOOT.uid)) return Promise.resolve({ok:0});
    return I.securityPoll();
  }

  /* ═══ التشغيل ═══ */
  primeAll();
  window.addEventListener('bassam:store', onStore);
  window.addEventListener('bassam:operations-commit', onOperationsCommit);
  window.addEventListener('bassam:remote', onRemote);
  setTimeout(function(){ try { tick(); pollSec(); } catch(e){} }, 6000);
  setInterval(function(){ try { tick(); } catch(e){} }, 5 * 60000);
  setInterval(function(){ try { bcDue(); } catch(e){} }, 30000);
  setInterval(function(){ try { pollSec(); } catch(e){} }, 3 * 60000);

  KIVO.BassamNotif = { REG:REG, LEAVES:LEAVES, TO:TO, LV:LV, CH:CH, KC:KC, KN:KN, KI:KI, GO_NAV:GO_NAV, goNav:goNav, goKpi:goKpi,
    cfg:cfg, typeOf:typeOf, types:types, setCfg:setCfg, resetCfg:resetCfg, _bust:I.refresh,
    emit:emit, list:list, unread:unread, markRead:markRead, ack:ack, markAll:markAll, dismiss:dismiss, dismissAll:dismissAll, goOk:goOk, muteGet:muteGet, muteSet:muteSet,
    bcAll:bcAll, bcSend:bcSend, bcWithdraw:bcWithdraw, bcRemind:bcRemind, bcStats:bcStats, bcPreviewMe:bcPreviewMe, bcDue:bcDue, bcSendDept:bcSendDept,
    targets:I.targets,status:I.status,refresh:I.refresh,loadMore:I.loadMore,refreshManagement:I.refreshManagement,loadMoreBroadcasts:I.loadMoreBroadcasts,exportDomain:I.exportDomain,
    tick:tick, pollSec:pollSec, fill:fill, prime:primeAll, _snap:SNAP };
  I.refresh();
})();
