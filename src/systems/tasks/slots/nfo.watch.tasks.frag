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
