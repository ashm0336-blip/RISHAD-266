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
