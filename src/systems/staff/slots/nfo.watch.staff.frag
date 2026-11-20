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
