/* ═══ التنبيهاتُ والتعاميم — المراقب: استنتاجُ الأحداث من فروق المخازن · الفحصُ الدوري · التشغيل ═══
   KIVO_257 · AUD-010: جزءٌ 2/2 من «src/services/440-notifications.js (الـIIFE الثالثة)» السابقة — مقسومةً بالمسؤولية بـtools/split_iife.mjs (tools/split/440-notifications.json)؛
   التبعياتُ بين الأجزاء صريحةٌ هنا وعبر المساحة الداخلية window.__BS_I.notif وحدها. */
(function(){
  var I = KIVO.__BS_I && KIVO.__BS_I.notif; if (!I || I.dead) return;   /* الجزءُ الأول لم يُحمَّل أو خرج مبكّراً ⇒ لا شيءَ بعده — كالـIIFE الواحدة */
  /* ← من الأجزاء السابقة */
  var D=I.D, GO_NAV=I.GO_NAV, J=I.J, KC=I.KC, KI=I.KI, KN=I.KN, LEAVES=I.LEAVES, LV=I.LV, P=I.P, REG=I.REG, TO=I.TO, CH=I.CH,
      ack=I.ack, bcAll=I.bcAll, bcDue=I.bcDue, bcPreviewMe=I.bcPreviewMe, bcRemind=I.bcRemind, bcSend=I.bcSend, bcSendDept=I.bcSendDept, bcStats=I.bcStats,
      bcWithdraw=I.bcWithdraw, bkTime=I.bkTime, cfg=I.cfg, deptName=I.deptName, depts=I.depts, dismiss=I.dismiss, dismissAll=I.dismissAll, emit=I.emit, fill=I.fill,
      goOk=I.goOk, isMgr=I.isMgr, isSuper=I.isSuper, list=I.list, markAll=I.markAll, markRead=I.markRead, me=I.me, monLbl=I.monLbl, muteGet=I.muteGet,
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

  WATCH['bassam_employees_v1'] = function(did, o, n){
    o = Array.isArray(o) ? o : []; n = Array.isArray(n) ? n : []; var key = function(e){ return e.eid || e.name; };
    var d = diffList(o, n, key);
    if (o.length && !n.length) { emit('emp_wipe', { dept: did, vars: { 'الإدارة': deptName(did), 'المُعدّل': who() } }); return; }
    if (d.added.length >= 5) emit('emp_imp', { dept: did, vars: { 'المضافون': d.added.length, 'المحدثون': d.both.filter(function(p){ return !eq(p[0], p[1]); }).length, 'المُعدّل': who() } });
    else d.added.forEach(function(e){ emit('emp_add', { dept: did, vars: { 'الاسم': e.name, 'النوع': e.type || '' } }); });
    d.removed.forEach(function(e){ emit('emp_del', { dept: did, vars: { 'الاسم': e.name, 'المُعدّل': who() } }); });
    var FN = { name:'الاسم', nid:'رقم الهوية', phone:'الجوال', email:'البريد', empno:'الرقم الوظيفي', type:'نوع التوظيف', work:'نوع العمل', gender:'الجنس', shift:'الوردية' };
    d.both.forEach(function(p){ var a = p[0], b = p[1]; var ch = Object.keys(FN).filter(function(f){ return (a[f] || '') !== (b[f] || ''); }); if (!ch.length) return; var ek = key(b);
      if (ch.indexOf('type') !== -1) { var f = 'type'; emit('emp_type', { dept: did, own: [ek], vars: { 'الحقل': FN[f], 'القيمة': b[f] || '—' } }); }
      var rest = ch.filter(function(f){ return f !== 'type' && f !== 'email'; }); if (rest.length) emit('emp_edit', { dept: did, own: [ek], vars: { 'الحقول': rest.map(function(f){ return FN[f]; }).join('، '), 'المُعدّل': who() } }); });
  };
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
  WATCH['bassam_shift_options_v1'] = function(did, o, n){
    o = Array.isArray(o) ? o : []; n = Array.isArray(n) ? n : [];
    if (!o.length && n.length > 1) return;   /* بذر الورديات الافتراضية ليس فعلَ مستخدم */
    var d = diffList(o, n, function(x){ return x && x.name; });
    var tm = function(x){ return (x && x.tStart && x.tEnd) ? (x.tStart + ' ← ' + x.tEnd) : 'بلا وقت'; };
    d.added.forEach(function(x){ emit('st_shdef', { dept: did, vars: { 'الفعل': 'أُضيفت', 'الوردية': x.name, 'التفصيل': tm(x), 'المُعدّل': who() } }); });
    d.removed.forEach(function(x){ emit('st_shdef', { dept: did, vars: { 'الفعل': 'حُذفت', 'الوردية': x.name, 'التفصيل': tm(x), 'المُعدّل': who() } }); });
    d.both.forEach(function(p){ var a = p[0], b = p[1]; if (eq(a, b)) return;
      var ch = []; if (tm(a) !== tm(b)) ch.push('الوقت ' + tm(a) + ' ← ' + tm(b)); if ((a.color||'') !== (b.color||'')) ch.push('اللون');
      if (!ch.length) return;
      emit('st_shdef', { dept: did, vars: { 'الفعل': 'عُدّلت', 'الوردية': b.name, 'التفصيل': ch.join(' · '), 'المُعدّل': who() } }); });
  };
  WATCH['bassam_perm_tpls_v1'] = function(did, o, n){
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
  var locTxt = function(v){ try { if (v == null) return '—'; if (typeof v === 'string' || typeof v === 'number') return String(v); if (Array.isArray(v)) { var a = v.map(function(x){ return (x && typeof x === 'object') ? (x.name || x.label || x.code || '') : String(x == null ? '' : x); }).filter(Boolean); return a.length ? a.join('، ') : 'موقع آخر'; } if (typeof v === 'object') return v.name || v.label || v.code || 'موقع آخر'; } catch(e){} return 'موقع آخر'; };
  WATCH['bassam_staffing_v3'] = function(did, o, n){
    o = o || {}; n = n || {};
    Object.keys(n).forEach(function(mk){ if (!/^\d+-\d+$/.test(mk)) return; var om = o[mk] || {}, nm = n[mk] || {}; var mon = monLbl(mk);
      var rows = Object.keys(nm).filter(function(k){ return k.indexOf('__') !== 0 && nm[k] && typeof nm[k] === 'object'; });
      var newMonth = !o[mk] && rows.length >= 5;
      if (newMonth) { emit('st_pub', { dept: did, vars: { 'الشهر': mon, 'العدد': rows.length, 'المُعدّل': who() } }); return; }
      rows.forEach(function(ek){ var a = om[ek] || {}, b = nm[ek] || {}; var nm1 = empName(did, ek);
        if ((a.shift || '') !== (b.shift || '') && b.shift && Object.keys(a).length) emit('st_shift', { dept: did, vars: { 'الاسم': nm1, 'الشهر': mon, 'القديم': a.shift || '—', 'الجديد': b.shift, 'المُعدّل': who() } });
        if (!eq(a.rest || [], b.rest || []) && Object.keys(a).length) emit('st_rest', { dept: did, vars: { 'الاسم': nm1, 'الشهر': mon, 'الأيام': (b.rest || []).join('، ') || 'بلا راحة', 'المُعدّل': who() } });
        if (!eq(a.loc || a.locs || null, b.loc || b.locs || null) && (b.loc || b.locs)) emit('st_loc', { dept: did, vars: { 'الاسم': nm1, 'اليوم': mon, 'الموقع': locTxt(b.loc || b.locs), 'القديم': (a.loc || a.locs) ? locTxt(a.loc || a.locs) : '—' } });
        var la = (a.leaves || []).length, lb = (b.leaves || []).length; if (lb > la) { var lv = b.leaves[lb - 1] || {}; emit('st_leave', { dept: did, vars: { 'الاسم': nm1, 'النوع': lv.kind || lv.k || 'استئذان', 'اليوم': (lv.d || lv.fd || '') + ' ' + mon, 'المُعدّل': who() } }); }
        if ((a.lead || '') !== (b.lead || '') && b.lead) emit('st_lead', { dept: did, vars: { 'الاسم': nm1, 'الدور': ({ chief:'رئيساً', deputy:'نائباً', lead:'رئيساً' }[b.lead] || (/[\u0600-\u06FF]/.test(String(b.lead)) ? b.lead : 'قائداً')), 'الوردية': b.shift || '', 'الشهر': mon } }); });
      /* اعتماد الشهر / قفله */
      var oa = !!(om.__lock || om.__ap), na = !!(nm.__lock || nm.__ap); if (oa !== na) emit('st_lock', { dept: did, vars: { 'الفعل': na ? 'اعتُمد وقُفل' : 'فُكّ اعتماد', 'الشهر': mon, 'المُعدّل': who() } });
    });
  };
  WATCH['bassam_staffing_locks_v1'] = function(did, o, n){ o = o || {}; n = n || {}; Object.keys(n).forEach(function(mk){ if (eq(o[mk], n[mk])) return; var locked = n[mk] === true || (n[mk] && n[mk].lock); var was = o[mk] === true || (o[mk] && o[mk].lock); if (!!locked !== !!was) emit('st_lock', { dept: did, vars: { 'الفعل': locked ? 'اعتُمد وقُفل' : 'فُكّ اعتماد', 'الشهر': monLbl(mk), 'المُعدّل': who() } }); }); };
  WATCH['bassam_tasks_v1'] = function(did, o, n){
    o = o || {}; n = n || {};
    Object.keys(n).forEach(function(day){ if (!/^\d+-\d+-\d+$/.test(day)) return; var oa = o[day] || [], na = n[day] || [];
      na.forEach(function(r, i){ var p = oa[i]; if (!Array.isArray(r)) return; var title = r[0] || 'مهمة'; var asg = r[14] || null;
        if (!p) { emit('task_new', { dept: did, own: asg ? [asg] : [], vars: { 'المهمة': title, 'الوقت': r[16] ? new Date(r[16]).toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' }) : (r[10] ? KIVO.BassamCount(r[10], "دقيقة") : '—') } }); return; }
        if (eq(p, r)) return;
        if (p[3] !== 'done' && r[3] === 'done') { var pf = r[21] && Array.isArray(r[21].imgs) ? r[21].imgs.length : 0; emit('task_done', { dept: did, vars: { 'الاسم': r[8] || empName(did, asg) || '—', 'المهمة': title + (pf ? ' — موثّقة بـ' + (pf === 1 ? 'صورة' : KIVO.BassamCount(pf, "صورة", "g")) : '') + (r[6] && r[6][1] ? ' · ' + r[6][1] : '') } }); }
        else if (p[3] !== 'declined' && r[3] === 'declined') emit('task_chg', { dept: did, own: [], vars: { 'الفعل': 'اعتُذر عن', 'المهمة': title, 'التفصيل': (r[8] || '') + ' — ' + ((r[20] && r[20].why) || 'بلا سبب') + ' · أعِد إسنادها' } });
        else if (!(p[20] && p[20].exp) && r[20] && r[20].exp) emit('task_chg', { dept: did, own: [], vars: { 'الفعل': 'لم تُقبل', 'المهمة': title, 'التفصيل': 'انقضت مهلة قبول ' + (r[8] || '') + ' بلا ردّ · أعِد إسنادها' } });
        else if (!p[11] && r[11]) emit('task_chg', { dept: did, own: [], vars: { 'الفعل': 'قُبلت', 'المهمة': title, 'التفصيل': (r[8] || '') + ' بدأ العمل عليها' } });
        else if (p[14] !== r[14] && r[14]) emit('task_new', { dept: did, own: [r[14]], vars: { 'المهمة': title, 'الوقت': r[16] ? new Date(r[16]).toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' }) : '—' } });
        else if (p[0] !== r[0] || p[1] !== r[1] || p[2] !== r[2] || p[15] !== r[15] || p[16] !== r[16]) emit('task_chg', { dept: did, own: asg ? [asg] : [], vars: { 'الفعل': 'عُدّلت', 'المهمة': title, 'التفصيل': 'بواسطة ' + who() } }); });
      if (oa.length > na.length) emit('task_chg', { dept: did, own: [], vars: { 'الفعل': 'حُذفت', 'المهمة': KIVO.BassamCount(oa.length - na.length, "مهمة"), 'التفصيل': 'يوم ' + day.replace(/-/g, '/') + ' بواسطة ' + who() } }); });
  };
  // Custody notifications belong to the typed server transaction; no retired KV observer.
  WATCH['bassam_dreport_v1'] = function(did, o, n){
    o = o || {}; n = n || {}; var today = todayKey().key; var isToday = function(day){ return day === today; }; var LB = { pr:'حاضر', ab:'غياب', pm:'استئذان', lv:'إجازة', tea:'استراحة', cls:'مغلق', rest:'راحة', rs:'راحة', tr:'محوَّل', ex:'مستثنى', late:'تأخر' };
    var changedDays = Object.keys(n).filter(function(day){ return /^\d+-\d+-\d+$/.test(day) && !eq(o[day], n[day]); });
    if (changedDays.length > 3) return;                    /* استيراد أو تهيئة تاريخية لا تُنتج تنبيهات تشغيل */
    changedDays.forEach(function(day){ var od = (o[day] || {}).shifts || {}, nd = (n[day] || {}).shifts || {};
      Object.keys(nd).forEach(function(sh){ var a = od[sh] || {}, b = nd[sh] || {}; var vday = day.replace(/-/g, '/');
        if (!a.pulled && b.pulled) { emit('rep_pull', { dept: did, vars: { 'الوردية': sh, 'اليوم': vday, 'المُعدّل': who() } }); if (b.cont) emit('rep_cont', { dept: did, vars: { 'الوردية': sh, 'اليوم': b.cont } });
          /* الاحتساب يبدأ هنا: كل موظف في الكشف يعرف ورديته اليوم — أو أن اليوم راحته */
          var ld0 = b.leaders || {}; var lead = [ld0.chief ? 'رئيس: ' + ld0.chief : '', ld0.deputy ? 'نائب: ' + ld0.deputy : ''].filter(Boolean).join(' · ') || '—';
          var tm = (b.def && (b.def.tStart || b.def.tEnd)) ? '(' + (b.def.tStart || '') + ' → ' + (b.def.tEnd || '') + ')' : '';
          var wdn = wdName(day); var restMap = (b.rest && typeof b.rest === 'object') ? b.rest : {};
          if (isToday(day)) (b.roster || []).forEach(function(r){ if (!r || !r.ekey) return; var rest = Array.isArray(restMap[r.ekey]) ? restMap[r.ekey] : restBase(did, day, r.ekey);
            if ((r.st || 'pr') === 'pr' && isRestOn(rest, wdn)) emit('rep_restday', { dept: did, own: [r.ekey], vars: { 'اليوم': wdn + ' ' + vday, 'الوردية': sh } });
            else emit('rep_today', { dept: did, own: [r.ekey], vars: { 'الوردية': sh, 'الوقت': tm, 'القيادة': lead, 'اليوم': vday } }); }); }
        /* أيام الراحة تُعدَّل داخل التقرير */
        var ra = (a.rest && typeof a.rest === 'object') ? a.rest : {}, rb = (b.rest && typeof b.rest === 'object') ? b.rest : {};
        if (isToday(day)) Object.keys(rb).forEach(function(ek){ if (a.pulled && !eq(ra[ek] || null, rb[ek] || null)) emit('rep_rest', { dept: did, own: [ek], vars: { 'الوردية': sh, 'الأيام': (rb[ek] || []).join('، ') || 'بلا راحة', 'المُعدّل': who() } }); });
        if (!!a.ap !== !!b.ap) { var pct = ''; try { var rs = b.roster || []; pct = rs.length ? Math.round(rs.filter(function(r){ return r.st === 'pr' || r.st === 'tin'; }).length / rs.length * 100) : ''; } catch(e){} emit('rep_ok', { dept: did, vars: { 'الفعل': b.ap ? 'اعتُمد' : 'فُكّ اعتماد', 'الوردية': sh, 'النسبة': pct } });
          if (b.ap && isToday(day)) (b.roster || []).forEach(function(r){ if (r && r.ekey) emit('rep_ap', { dept: did, own: [r.ekey], vars: { 'الوردية': sh, 'اليوم': vday, 'الحالة': LB[r.st || 'pr'] || 'حاضر' } }); }); if (b.ap && pct !== '' && pct < 80) emit('kp_att', { dept: did, vars: { 'الوردية': sh, 'النسبة': pct, 'الحد': 80 } }); }
        var la = a.leaders || {}, lb = b.leaders || {}; ['chief','deputy'].forEach(function(role){ if ((la[role] || '') !== (lb[role] || '') && lb[role]) { var ek = ekeyByName(did, lb[role]); emit('rep_lead', { dept: did, own: ek ? [ek] : [], vars: { 'الدور': role === 'chief' ? 'رئيس' : 'نائب رئيس', 'الوردية': sh, 'الاسم': lb[role] } }); } });
        var pm = {}; (a.roster || []).forEach(function(r){ pm[r.ekey] = r; });
        (b.roster || []).forEach(function(r){ var p = pm[r.ekey]; if (p && p.st === r.st && (p.loc || '') === (r.loc || '')) return;
          if ((!p || p.st !== r.st) && (r.st === 'ab' || r.st === 'pm' || r.st === 'lv')) { emit('rep_att', { dept: did, own: [r.ekey], vars: { 'الحالة': LB[r.st] || 'مؤشَّر', 'الوردية': sh, 'اليوم': vday } });
            if (r.st === 'pm') { var q = pmCount(n, day, r.ekey); if (q >= 2) emit('rep_quota', { dept: did, own: [r.ekey], vars: { 'الاسم': r.name || empName(did, r.ekey), 'الشهر': monLbl(day.split('-').slice(0, 2).join('-')), 'العدد': q, 'الحد': 2 }, once: 'quota:' + day.split('-').slice(0, 2).join('-') + ':' + r.ekey }); } }
          if (r.tin && (!p || !p.tin)) emit('rep_mv', { dept: did, own: [r.ekey], vars: { 'الوردية': sh, 'الموقع': r.loc || r.tfrom || '—', 'المُعدّل': who() } });
          else if (p && (p.loc || '') !== (r.loc || '') && r.loc) emit('rep_here', { dept: did, own: [r.ekey], vars: { 'الموقع': r.loc, 'الوردية': sh } }); }); }); });
  };
  var WD = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  function wdName(day){ /* اسم يوم الأسبوع لتاريخ هجري y-m-d بالتقويم أم القرى */
    try { var p = day.split('-').map(Number); var fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year:'numeric', month:'numeric', day:'numeric' }); var t = new Date(); for (var i = -400; i <= 400; i++) { var d = new Date(t.getTime() + i * 86400000); var parts = {}; fmt.formatToParts(d).forEach(function(x){ parts[x.type] = x.value; }); if (+parts.year === p[0] && +parts.month === p[1] && +parts.day === p[2]) return WD[d.getDay()]; } } catch(e){} return '';
  }
  function isRestOn(rest, wdn){ return !!wdn && (rest || []).some(function(r){ return r === wdn || ('ال' + r) === wdn || r === ('ال' + wdn); }); }
  function restBase(did, day, ek){ try { var st = J(rawGet('bsdept:' + did + ':bassam_staffing_v3'), {}) || {}; var mk = day.split('-').slice(0, 2).join('-'); var e = (st[mk] || {})[ek]; return e && Array.isArray(e.rest) ? e.rest : []; } catch(e){ return []; } }
  function pmCount(rep, day, ek){ var mk = day.split('-').slice(0, 2).join('-'); var n = 0; Object.keys(rep || {}).forEach(function(d){ if (d.indexOf(mk + '-') !== 0) return; var sh = (rep[d] || {}).shifts || {}; var hit = false; Object.keys(sh).forEach(function(s2){ ((sh[s2] || {}).roster || []).forEach(function(r){ if (r && r.ekey === ek && r.st === 'pm') hit = true; }); }); if (hit) n++; }); return n; }
  function ekeyByName(did, name){ try { var emps = J(rawGet('bsdept:' + did + ':bassam_employees_v1'), []); var e = (emps || []).filter(function(x){ return x.name === name || x.eid === name || x.nid === name; })[0]; if (!e) return ''; try { var E = KIVO.BassamEmp; if (E && E.key) return E.key(e) || ''; } catch (e2) {} return e.eid || e.nid || e.name || ''; } catch(e){ return ''; } }
  function ekeyOfTok(did, tok){ try { var emps = J(rawGet('bsdept:' + did + ':bassam_employees_v1'), []) || []; var e = emps.filter(function(x){ return x.eid === tok || x.nid === tok || x.name === tok; })[0]; return e ? (e.eid || e.name) : String(tok); } catch(e){ return String(tok); } }
  function elLabel(kind, el){ if (kind === 'zones') return el.code || el.name || 'مصلى'; if (kind === 'marks') return el.label || el.kind || 'معلم'; return el.label || ('باب ' + (el.num || '')); }
  function spotsOf(rec){ /* موقع كل موظف في الجولة: {token: {label, closed}} */
    var out = {}; if (!rec || !Array.isArray(rec.d)) return out;
    rec.d.forEach(function(f){ [['gates', f.gates || []], ['zones', f.zones || []], ['marks', f.marks || []]].forEach(function(pair){ pair[1].forEach(function(el){ if (!el) return; var closed = pair[0] === 'gates' ? !!el.closed : !!el.off; (el.emp || []).forEach(function(t){ out[t] = { label: elLabel(pair[0], el), closed: closed }; }); }); }); });
    return out;
  }
  WATCH['bassam_rounds_v1'] = function(did, o, n){
    o = o || {}; n = n || {}; var today = todayKey().key;
    var changed = Object.keys(n).filter(function(k){ return /^\d+-\d+-\d+$/.test(k) && !eq(o[k], n[k]); }); if (changed.length > 3) return;
    changed.forEach(function(k){ var a = o[k], b = n[k]; var vday = k.replace(/-/g, '/');
      if (!a && b) emit('rn_start', { dept: did, vars: { 'الفعل': 'بدأت', 'الوردية': 'يوم ' + vday, 'المُعدّل': who() } }); if (a && b && !a.ap && b.ap) emit('rn_start', { dept: did, vars: { 'الفعل': 'أُغلقت', 'الوردية': 'جولة ' + vday, 'المُعدّل': who() } });
      if (!b || !Array.isArray(b.d)) return;
      /* موقع كل موظف: أول تسكين، وتغيّره، وإغلاق موقعه */
      var sa = spotsOf(a), sb = spotsOf(b);
      if (k === today) Object.keys(sb).forEach(function(t){ var x = sb[t], y = sa[t]; var ek = ekeyOfTok(did, t);
        if (!y) { if (a) emit('rn_loc', { dept: did, own: [ek], vars: { 'الفعل': 'موقعك في جولة اليوم:', 'الموقع': x.label, 'اليوم': vday } }); else emit('rn_loc', { dept: did, own: [ek], vars: { 'الفعل': 'موقعك اليوم:', 'الموقع': x.label, 'اليوم': vday } }); }
        else if (y.label !== x.label) emit('rn_loc', { dept: did, own: [ek], vars: { 'الفعل': 'تغيّر موقعك من «' + y.label + '» إلى', 'الموقع': x.label, 'اليوم': vday } });
        else if (!y.closed && x.closed) emit('rn_close', { dept: did, own: [ek], vars: { 'الموقع': x.label, 'اليوم': vday } }); });
      var gatesAll = function(rec){ var g = []; (rec && Array.isArray(rec.d) ? rec.d : []).forEach(function(f){ g = g.concat(f.gates || []); }); return g; };
      /* رصد ميداني: كل موقعٍ تغيّر وقت رصده — إشعارٌ مستقلٌّ لكل موقع (بطلب المستخدم)
         يصل صاحب الموقع ورئيس الوردية والمدير، للأبواب والمصليات والمعالم جميعاً. */
      try { var FD = KIVO.BassamField; if (FD) {
        var elsAll = function(rec){ var L = []; (rec && Array.isArray(rec.d) ? rec.d : []).forEach(function(f, fi){ ['gates','zones','marks'].forEach(function(kk){ (f[kk] || []).forEach(function(el, i){ L.push({ id: fi + ':' + kk + ':' + i, kind: kk, el: el }); }); }); }); return L; };
        var pa = {}; elsAll(a).forEach(function(x){ pa[x.id] = x.el; });
        elsAll(b).forEach(function(x){ var g = x.el, p = pa[x.id]; if (!g || !g.fAt || (p && p.fAt === g.fAt)) return;
          var st = FD.stateOf(g, x.kind), fl = FD.flowOf(g);
          var stTxt = FD.STATES[st].t + (fl && st !== 'closed' ? ' · ' + FD.FLOWS[fl].t : '');
          var owns = (g.emp || []).map(function(t){ return ekeyOfTok(did, t); }).filter(Boolean);
          var vars = { 'الموظف': g.fBy || who(), 'الباب': FD.label(g, x.kind), 'الحالة': stTxt, 'السبب': (st === 'closed' && g.cWhy) ? ' — ' + g.cWhy : '', 'الوقت': FD.clock(g.fAt) };
          emit('fd_obs', { dept: did, own: owns, vars: vars, once: 'fd:' + k + ':' + x.id + ':' + g.fAt }); }); } } catch (eF) {}
      var reds = gatesAll(b).filter(function(g){ return !g.closed && (g.needN || 0) > 0 && (g.emp || []).length === 0; }); var preds = gatesAll(a).filter(function(g){ return !g.closed && (g.needN || 0) > 0 && (g.emp || []).length === 0; });
      if (reds.length && reds.length > preds.length) emit('rn_red', { dept: did, vars: { 'الموقع': reds.map(function(g){ return g.label || g.num; }).slice(0, 3).join('، '), 'الوقت': new Date().toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' }) }, once: 'red:' + k + ':' + reds.map(function(g){ return g.num; }).join(',') });
      if (!reds.length && preds.length && gatesAll(b).length) emit('rn_full', { dept: did, vars: { 'العدد': gatesAll(b).length, 'الوقت': new Date().toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' }) }, once: 'full:' + k + ':' + Date.now() }); });
  };
  WATCH['bassam_plan_v1'] = function(did, o, n){
    o = o || {}; n = n || {}; if (!Object.keys(o).length) return;
    var og = o.gates || [], ng = n.gates || []; var changed = [];
    ng.forEach(function(g, i){ var p = og[i]; if (!p) { changed.push('إضافة «' + (g.label || g.num) + '»'); return; } if (!!p.closed !== !!g.closed) emit('pl_cap', { dept: did, vars: { 'الموقع': g.label || g.num, 'التفصيل': g.closed ? 'أُغلق' : 'فُتح', 'المُعدّل': who() } }); else if ((p.needN || 0) !== (g.needN || 0)) emit('pl_cap', { dept: did, vars: { 'الموقع': g.label || g.num, 'التفصيل': 'الاحتياج ' + (p.needN || 0) + ' ← ' + (g.needN || 0), 'المُعدّل': who() } }); else if (!eq(p.emp || [], g.emp || [])) { changed.push((g.label || g.num) + ': ' + KIVO.BassamCount((g.emp || []).length, "موظف")); } });
    /* تسكين الموظف: يُقارن موضعه في كل الطوابق وكل الأنواع (أبواب · مصليات · معالم)
       قبل الحفظ وبعده. أول تسكين → «سُكِّنت على …» (pl_place)، وانتقال من موقع
       قائم → «نُقلت من … إلى …» (pl_move). كان يُقارن أبواب الطابق الحالي فقط
       فيأتي «نُقلت من «—»» عند أول تسكين. */
    try {
      var plWord = { z: 'مصلى', g: 'باب', m: 'معلم' };
      var plLabel = function(k, el){ if (k === 'g') return (el.num != null && String(el.num).trim()) ? 'باب ' + String(el.num).trim() + (el.label ? ' — ' + el.label : '') : (el.label || 'باب'); if (k === 'z') return plWord.z + ' ' + (el.code || el.name || ''); return plWord.m + ' ' + (el.label || el.kind || ''); };
      var plMap = function(pl){ var m = {}; var fls = Array.isArray(pl.floors) && pl.floors.length ? pl.floors : [{ zones: pl.zones, gates: pl.gates, marks: pl.marks }];
        fls.forEach(function(f){ if (!f) return; [['z', f.zones], ['g', f.gates], ['m', f.marks]].forEach(function(pr){ (pr[1] || []).forEach(function(el){ if (!el) return; (el.emp || []).forEach(function(nm){ if (!nm) return; (m[nm] = m[nm] || []).push(plLabel(pr[0], el)); }); }); }); }); return m; };
      var pmO = plMap(o), pmN = plMap(n); var tNow = new Date().toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' });
      var names = {}; Object.keys(pmO).forEach(function(nm){ names[nm] = 1; }); Object.keys(pmN).forEach(function(nm){ names[nm] = 1; });
      Object.keys(names).forEach(function(nm){ var was = pmO[nm] || [], now = pmN[nm] || [];
        var fresh = now.filter(function(l){ return was.indexOf(l) === -1; }), gone = was.filter(function(l){ return now.indexOf(l) === -1; });
        if (!fresh.length && !gone.length) return; var ek = ekeyByName(did, nm); if (!ek) return;
        if (fresh.length && gone.length) emit('pl_move', { dept: did, own: [ek], vars: { 'من': gone.join('، '), 'إلى': fresh.join('، '), 'الوقت': tNow, 'المُعدّل': who() } });
        else if (fresh.length) emit('pl_place', { dept: did, own: [ek], vars: { 'إلى': fresh.join('، '), 'الوقت': tNow, 'المُعدّل': who() } });
        else emit('pl_unplace', { dept: did, own: [ek], vars: { 'من': gone.join('، '), 'الوقت': tNow, 'المُعدّل': who() } }); });
    } catch (e) {}
    if (changed.length) emit('pl_chg', { dept: did, vars: { 'الموقع': KIVO.BassamCount(changed.length, "موقع"), 'التفصيل': changed.slice(0, 3).join(' · ') } });
    var om = (o.marks || []).length + (o.paths || []).length, nmk = (n.marks || []).length + (n.paths || []).length; if (nmk > om) emit('pl_mark', { dept: did, vars: { 'النوع': (n.marks || []).length > (o.marks || []).length ? 'علامة' : 'مسار', 'الاسم': '', 'الموقع': '' } });
    if (!o.ap && n.ap) emit('pl_ok', { dept: did, vars: { 'الشهر': monLbl(n.apM || ''), 'العدد': ng.length } });
  };
  // Seized and Award events are issued by their server transaction.
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
  function todayKey(){ try { var p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year:'numeric', month:'numeric', day:'numeric' }).formatToParts(new Date()); var g = function(t){ return (p.filter(function(x){ return x.type === t; })[0] || {}).value; }; return { y:+g('year'), m:+g('month'), d:+g('day'), key: g('year') + '-' + g('month') + '-' + g('day') }; } catch(e){ var d = new Date(); return { y:d.getFullYear(), m:d.getMonth() + 1, d:d.getDate(), key:'g' + d.toISOString().slice(0, 10) }; } }
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
      /* التقرير: مسحوب بلا اعتماد قبل نهاية الوردية بساعة */
      try { var dr = J(rawGet('bsdept:' + did + ':bassam_dreport_v1'), {}); var day = dr[T.y + '-' + T.m + '-' + T.d]; var shifts = J(rawGet('bsdept:' + did + ':bassam_shift_options_v1'), []) || []; if (day && day.shifts) Object.keys(day.shifts).forEach(function(sh){ var s = day.shifts[sh]; if (!s.pulled || s.ap) return; var so = (shifts || []).filter(function(x){ return (x.name || x) === sh; })[0]; var end = so && so.tEnd; if (!end) return; var m = /^(\d+):(\d+)/.exec(end); if (!m) return; var endMin = +m[1] * 60 + +m[2], nowMin = hh * 60 + now.getMinutes(); if (endMin - nowMin > 0 && endMin - nowMin <= 60) emit('rep_late', { dept: did, vars: { 'الوردية': sh, 'الوقت': end }, once: 'rep_late:' + T.key + ':' + sh }); }); } catch(e){}
      /* نقص الغد */
      if (hh >= 16) try { var stf = J(rawGet('bsdept:' + did + ':bassam_staffing_v3'), {}); var mon = stf[T.y + '-' + T.m] || {}; var cnt = {}; Object.keys(mon).forEach(function(ek){ var r = mon[ek]; if (!r || typeof r !== 'object' || ek.indexOf('__') === 0) return; cnt[r.shift] = (cnt[r.shift] || 0) + 1; }); var vals = Object.keys(cnt).map(function(k){ return cnt[k]; }); var avg = vals.length ? vals.reduce(function(a, b){ return a + b; }, 0) / vals.length : 0; Object.keys(cnt).forEach(function(sh){ if (avg && cnt[sh] < avg * 0.5) emit('st_gap', { dept: did, vars: { 'الوردية': sh, 'العدد': Math.ceil(avg * 0.5 - cnt[sh]) }, once: 'gap:' + T.key + ':' + sh }); }); } catch(e){}
      /* العهد المتأخرة */
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

  KIVO.BassamNotif = { REG:REG, LEAVES:LEAVES, TO:TO, LV:LV, CH:CH, KC:KC, KN:KN, KI:KI, GO_NAV:GO_NAV,
    cfg:cfg, typeOf:typeOf, types:types, setCfg:setCfg, resetCfg:resetCfg, _bust:I.refresh,
    emit:emit, list:list, unread:unread, markRead:markRead, ack:ack, markAll:markAll, dismiss:dismiss, dismissAll:dismissAll, goOk:goOk, muteGet:muteGet, muteSet:muteSet,
    bcAll:bcAll, bcSend:bcSend, bcWithdraw:bcWithdraw, bcRemind:bcRemind, bcStats:bcStats, bcPreviewMe:bcPreviewMe, bcDue:bcDue, bcSendDept:bcSendDept,
    targets:I.targets,status:I.status,refresh:I.refresh,loadMore:I.loadMore,refreshManagement:I.refreshManagement,loadMoreBroadcasts:I.loadMoreBroadcasts,exportDomain:I.exportDomain,
    tick:tick, pollSec:pollSec, fill:fill, prime:primeAll, _snap:SNAP };
  I.refresh();
})();
