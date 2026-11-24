  var locTxt = function(v){ try { if (v == null) return '—'; if (typeof v === 'string' || typeof v === 'number') return String(v); if (Array.isArray(v)) { var a = v.map(function(x){ return (x && typeof x === 'object') ? (x.name || x.label || x.code || '') : String(x == null ? '' : x); }).filter(Boolean); return a.length ? a.join('، ') : 'موقع آخر'; } if (typeof v === 'object') return v.name || v.label || v.code || 'موقع آخر'; } catch(e){} return 'موقع آخر'; };
  /* V7 · 53 (FIX_53_LIVEQA ١ · ٣ · ١٤ · FIX_53_SCALE S12): الجدولُ الشهري —
     · الموظفُ تصله ورديتُه هو (st_myshift · own): رسالةٌ لكل ورديةٍ أُسندت، مستلموها مَن أُسندت إليهم وحدهم — فكلُّ موظفٍ يصله تنبيهٌ واحد.
     · فعلٌ جماعي (NF_STAFF_BULK فأكثر في حفظٍ واحد) تنبيهٌ مجمّعٌ واحد لكل وردية للمدير ورئيس تلك الوردية (st_shiftm) لا تنبيهٌ لكل موظف.
     · شهرٌ مضى (nfPastMonth — الموضعُ الواحد لقرار S12): لا تنبيهَ للموظفين ولا لكل تغيير؛ تنبيهٌ واحد للمدير «تحديث جدول شهر سابق» (st_past). */
  var NF_STAFF_BULK = 5;
  function nfPastMonth(mk){ try { var t = todayKey(), p = String(mk).split('-').map(Number); if (/^g/.test(String(t.key)) || p.length !== 2) return false; return p[0] * 12 + p[1] < Number(t.y) * 12 + Number(t.m); } catch(e){ return false; } }
  function nfByShift(list){ var g = {}, order = []; list.forEach(function(x){ if (!g[x.s]) { g[x.s] = []; order.push(x.s); } g[x.s].push(x.ek); }); return order.map(function(s){ return { s: s, eks: g[s] }; }); }
  WATCH['bassam_staffing_v3'] = function(did, o, n){
    o = o || {}; n = n || {}; var pastMon = [], pastEks = {};
    Object.keys(n).forEach(function(mk){ if (!/^\d+-\d+$/.test(mk)) return; var om = o[mk] || {}, nm = n[mk] || {}; var mon = monLbl(mk);
      var rows = Object.keys(nm).filter(function(k){ return k.indexOf('__') !== 0 && nm[k] && typeof nm[k] === 'object'; });
      var newMonth = !o[mk] && rows.length >= 5, past = nfPastMonth(mk);
      var oa = !!(om.__lock || om.__ap), na = !!(nm.__lock || nm.__ap);
      var lockEv = function(){ if (oa !== na) emit('st_lock', { dept: did, vars: { 'الفعل': na ? 'اعتُمد وقُفل' : 'فُكّ اعتماد', 'الشهر': mon, 'المُعدّل': who() } }); };
      if (past) { var touched = rows.filter(function(ek){ return !eq(om[ek] || null, nm[ek]); });
        if (touched.length) { pastMon.push(mon); touched.forEach(function(ek){ pastEks[ek] = 1; }); }
        lockEv(); return; }
      /* وردية كل موظف أُسندت إليه أو تغيّرت — نشرُ الشهر إسنادٌ أيضاً */
      var asg = rows.filter(function(ek){ var a = om[ek] || {}, b = nm[ek] || {}; return b.shift && (a.shift || '') !== b.shift; }).map(function(ek){ return { ek: ek, s: String(nm[ek].shift) }; });
      nfByShift(asg).forEach(function(g){ emit('st_myshift', { dept: did, own: g.eks, vars: { 'الوردية': g.s, 'الشهر': mon, 'المُعدّل': who() } }); });
      if (newMonth) { emit('st_pub', { dept: did, vars: { 'الشهر': mon, 'العدد': rows.length, 'المُعدّل': who() } }); return; }
      var bulk = asg.length >= NF_STAFF_BULK;
      /* V7 · 53 (قرار المالك REPLY_53_1): إلغاءُ وردية موظف يُبلَّغ به الموظفُ نفسُه وحده (st_unshift — رسالةٌ لكل ورديةٍ أُلغيت، مستلموها أصحابُها)؛
         ومن NF_STAFF_BULK إلغاءً فأكثر في حفظٍ واحد للمدير ورئيس تلك الوردية تنبيهٌ مجمّعٌ واحد (st_unshiftm). الفاعلُ لا يصله شيء (السجلّ: «فور الحفظ») */
      var unasg = Object.keys(om).filter(function(ek){ var a = om[ek], b = nm[ek]; return ek.indexOf('__') !== 0 && a && typeof a === 'object' && a.shift && !(b && typeof b === 'object' && b.shift); }).map(function(ek){ return { ek: ek, s: String(om[ek].shift) }; });
      nfByShift(unasg).forEach(function(g){ emit('st_unshift', { dept: did, own: g.eks, vars: { 'القديم': g.s, 'الشهر': mon, 'المُعدّل': who() } }); });
      if (unasg.length >= NF_STAFF_BULK) nfByShift(unasg).forEach(function(g){ emit('st_unshiftm', { dept: did, vars: { 'الوردية': g.s, 'العدد': KIVO.BassamCount(g.eks.length, 'موظف', 'g'), 'الشهر': mon, 'المُعدّل': who() } }); });
      if (bulk) nfByShift(asg).forEach(function(g){ emit('st_shiftm', { dept: did, vars: { 'الوردية': g.s, 'العدد': KIVO.BassamCount(g.eks.length, 'موظف', 'g'), 'الشهر': mon, 'المُعدّل': who() } }); });
      rows.forEach(function(ek){ var a = om[ek] || {}, b = nm[ek] || {}; var nm1 = empName(did, ek);
        if (!bulk && (a.shift || '') !== (b.shift || '') && b.shift && Object.keys(a).length) emit('st_shift', { dept: did, vars: { 'الاسم': nm1, 'الشهر': mon, 'القديم': a.shift || 'بلا وردية', 'الجديد': b.shift, 'المُعدّل': who() } });
        if (!eq(a.rest || [], b.rest || []) && Object.keys(a).length) emit('st_rest', { dept: did, vars: { 'الاسم': nm1, 'الشهر': mon, 'الأيام': (b.rest || []).join('، ') || 'بلا راحة', 'المُعدّل': who() } });
        if (!eq(a.loc || a.locs || null, b.loc || b.locs || null) && (b.loc || b.locs)) emit('st_loc', { dept: did, vars: { 'الاسم': nm1, 'اليوم': mon, 'الموقع': locTxt(b.loc || b.locs), 'القديم': (a.loc || a.locs) ? locTxt(a.loc || a.locs) : 'بلا موقع' } });
        var la = (a.leaves || []).length, lb = (b.leaves || []).length; if (lb > la) { var lv = b.leaves[lb - 1] || {}; emit('st_leave', { dept: did, vars: { 'الاسم': nm1, 'النوع': lv.kind || lv.k || 'استئذان', 'اليوم': (lv.d || lv.fd || '') + ' ' + mon, 'المُعدّل': who() } }); }
        if ((a.lead || '') !== (b.lead || '') && b.lead) emit('st_lead', { dept: did, vars: { 'الاسم': nm1, 'الدور': ({ chief:'رئيساً', deputy:'نائباً', lead:'رئيساً' }[b.lead] || (/[\u0600-\u06FF]/.test(String(b.lead)) ? b.lead : 'قائداً')), 'الوردية': b.shift || '', 'الشهر': mon } }); });
      /* اعتماد الشهر / قفله */
      lockEv();
    });
    /* أشهرٌ سابقة في حفظٍ واحد (ملءُ الماضي): تنبيهٌ واحد للمدير */
    if (pastMon.length) emit('st_past', { dept: did, vars: { 'الشهر': pastMon.length <= 3 ? pastMon.join('، ') : pastMon[0] + ' … ' + pastMon[pastMon.length - 1] + ' (' + KIVO.BassamCount(pastMon.length, 'شهر') + ')', 'العدد': KIVO.BassamCount(Object.keys(pastEks).length, 'موظف'), 'المُعدّل': who() } });
  };
  WATCH['bassam_staffing_locks_v1'] = function(did, o, n){ o = o || {}; n = n || {}; Object.keys(n).forEach(function(mk){ if (eq(o[mk], n[mk])) return; var locked = n[mk] === true || (n[mk] && n[mk].lock); var was = o[mk] === true || (o[mk] && o[mk].lock); if (!!locked !== !!was) emit('st_lock', { dept: did, vars: { 'الفعل': locked ? 'اعتُمد وقُفل' : 'فُكّ اعتماد', 'الشهر': monLbl(mk), 'المُعدّل': who() } }); }); };
