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
