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
