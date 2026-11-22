  /* V7 · د6: رصد الحالات — حالةٌ جديدة (والعاليةُ/الحرجة تنبيهٌ فوري عاجلٌ لمدير الإدارة) · حذفٌ أو تعديل. لا «إغلاق»: «حالة الحالة» مرفوضة */
  WATCH['bassam_rasd_v1'] = function(did, o, n){
    var or = (o && o.reports) || [], nr = (n && n.reports) || [], d = diffList(or, nr, function(r){ return r.id; });
    var vars = function(r, more){ var x = { 'النوع': r.type || '—', 'الموقع': r.spot || r.zone || '—', 'التأثير': r.impact || '—', 'الإجراء': r.act || '—', 'الراصد': r.byName || '' }; for (var k in (more || {})) x[k] = more[k]; return x; };
    d.added.forEach(function(r){ emit(r.impact === 'حرج' || r.impact === 'عالٍ' ? 'rz_hot' : 'rz_new', { dept: did, vars: vars(r) }); });
    d.removed.forEach(function(r){ emit('rz_edit', { dept: did, vars: vars(r, { 'الفعل': 'حُذفت', 'المُعدّل': who() }) }); });
    d.both.forEach(function(p){ if (!eq(p[0], p[1])) emit('rz_edit', { dept: did, vars: vars(p[1], { 'الفعل': 'عُدّلت', 'المُعدّل': who() }) }); });
  };
