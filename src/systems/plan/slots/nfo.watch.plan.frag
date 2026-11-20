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
