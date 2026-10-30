/* ══ (4) القراءة — مفاتيحُ القراءة المربوطة صراحةً (readBindings · P4.1.1-01) محمولةٌ في الإدارة ∧ Department/Branch،
   ثم إسقاطُ السجلات خارج النطاق (D4-01): المصدر · الوردية (D4-09) · الموقع/العنصر · المسنَد (P4.2-05) · العدساتُ المعطّلة.
   الإسقاطُ لا الحذف حيث يرسم السجلُّ خريطة (الطوابق والعناصر تبقى هياكلَ بلا حقول الحالة)، والأجزاءُ المحجوبة تُعاد
   من الخادم عند الكتابة (merge-on-write) فلا يمحوها من لا يراها، ولا يكتب فيها من لا يملكها.
   fail-closed (P4.1.1-04): لا ميزانيةَ تتخطّى سجلاً — أيُّ خطأٍ في الإسقاط ⇒ القراءةُ مرفوضة. ══ */
function canReadEnf(A, k) {
  if (!A || !A.u) return false;
  var u = A.u, P = parseKey(k), rn = resName(k), i;
  if (u.role === 'super') return true;                                       /* مديرُ النظام يقرأ كلَّ شيء (Global) — كما AS‑IS */
  if (!P.dept) {
    if (P.name === K_DSTATS) { var S = enfSources(A, 'read'); return !!(S.haram || S.nabawi); }
    if (P.name === K_NSYS) return false;
    var R = resOf(k); if (!R) return false;                                  /* موردٌ مجهول = رفض */
    return R.scope === 'global';                                             /* السجلاتُ العامة للجلسة (I-06 · allowlist) */
  }
  if (!deptInScope(A, P.dept)) return false;
  if (rn === ENF_SCOPE_RES || rn === ENF_GRANTS_RES) return isMgrOf(A, P.dept);  /* سجلّا النطاق والمنح: مديرُ الإدارة (والموظفُ يتسلّم نطاقَه ومفاتيحَه الفعلية في الإقلاع) */
  var R2 = resOf(k);
  if (!R2 || R2.scope !== 'dept') return false;
  if (R2.rule) {
    if (P.name.indexOf('bassam_notif_dev_v1:') === 0) return P.name === 'bassam_notif_dev_v1:' + u.id || isMgrOf(A, P.dept);   /* Own */
    return true;                                                             /* التنبيهاتُ (self) · الراياتُ التقنية · الملف — قواعدُها تحرسها */
  }
  var RK = KIVO_SCOPE.readKeysFor(rn);
  if (!RK.known || !RK.keys.length) return false;
  for (i = 0; i < RK.keys.length; i++) if (enfHeld(A, P.dept, RK.keys[i])) return true;
  return false;
}
/* رقمُ المراجعة بلا قيمة: لمن يقرأ أو يكتب المورد أو يملك تبعةً تكتب فيه (الاستبدال · حذفُ الموظف · إعادةُ تسمية الوردية) */
function canSeeEnf(A, k) {
  if (canReadEnf(A, k)) return true;
  var P = parseKey(k); if (!P.dept || !deptInScope(A, P.dept)) return false;
  var R = resOf(k); if (!R || R.scope !== 'dept') return false;
  if (R.rule) return true;
  if (enfResWriter(A, P.dept, resName(k))) return true;
  return enfHeld(A, P.dept, 'import.replace') || enfHeld(A, P.dept, 'emp.record.delete') || enfHeld(A, P.dept, 'emp.record.bulk.delete') || enfHeld(A, P.dept, 'ref.shift.edit');
}
/* ── سياقُ العرض لفاعلٍ على موردٍ في إدارة: الأبعادُ المقيِّدة = ما تشترك فيه كلُّ مفاتيح القراءة المحمولة (أيُّ مفتاحٍ بلا البُعد يكفي لرفع قيده — كما evaluateRead) ── */
function enfDimsOf(key) { var e = KIVO_REGISTRY.byKey[key]; return e ? e.scopeDims : []; }
function enfViewCtx(A, d, rn, refs) {
  var cache = A.__enfV || (A.__enfV = {}), ck = d + '|' + rn;
  if (cache[ck]) return cache[ck];
  var RK = KIVO_SCOPE.readKeysFor(rn), held = [], i;
  for (i = 0; i < RK.keys.length; i++) if (enfHeld(A, d, RK.keys[i])) held.push(RK.keys[i]);
  var dims = ['Shift', 'Site', 'Zone/Element', 'Assigned', 'Source'], rs = {}, j;
  for (j = 0; j < dims.length; j++) { var all = held.length > 0; for (i = 0; i < held.length && all; i++) if (enfDimsOf(held[i]).indexOf(dims[j]) === -1) all = false; rs[dims[j]] = all; }
  var act = permv4Actor(A).actor, ceilActor = KIVO_SCOPE.isCeiling(act), E = { recs: (refs && refs.recs) || {} }, staffing = refs && refs.staffing ? refs.staffing[d] : null;
  var V = { d: d, rn: rn, held: held, restrict: rs, ceil: ceilActor, E: E, sources: enfSources(A, 'read'), fieldOnly: dailyFieldOnly(A, d), ekey: String(A.u.ekey || ''),
    lens: { zones: true, gates: true, marks: true, paths: true, dist: true, dens: true } };
  for (var L in V.lens) V.lens[L] = KIVO_BUILD.lensGate(A.perms, A.u, d, L).on;
  V.shiftOk = function (sh, ym) {
    if (!V.restrict.Shift || V.ceil) return true;
    var es = enfEmpScopeOf(E, d, V.ekey, 'Shift');
    if (!es || es.mode === 'unknown') return false;
    if (es.mode === 'n/a') return true;
    if (es.mode === 'list') return enfHas(es.list || [], sh);
    var m = isObj(staffing) ? staffing[ym] : null, r = isObj(m) ? m[V.ekey] : null, mine = isObj(r) && r.shift ? String(r.shift) : null;
    return !!mine && String(sh) === mine;
  };
  V.valOk = function (dim, v) {
    var lst = null;
    if (!V.ceil) { var es = enfEmpScopeOf(E, d, V.ekey, dim); if (!es || es.mode === 'unknown') return false; if (es.mode === 'list') lst = es.list || []; else if (es.mode === 'single') lst = [es.value]; }
    if (lst && !enfHas(lst, v)) return false;
    var ceil = enfCeilingOf(E, d, dim); if (ceil === null) return false;
    return ceil === 'ALL' || enfHas(ceil, v);
  };
  V.siteOk = function (sid) { return !V.restrict.Site || V.valOk('Site', sid); };
  V.zoneOk = function (eid) { return !V.restrict['Zone/Element'] || V.valOk('Zone/Element', eid); };
  return (cache[ck] = V);
}
/* هويّاتُ المحرّك نفسُها (KIVO_238 IH-01/02: uid أولاً · sid للطابق) */
var ENF_ID = {
  zones: function (e) { if (!isObj(e)) return null; if (e.uid != null && e.uid !== '') return 'u:' + e.uid; var v = e.code || e.ser || e.name || e.id || e.eid; return v == null || v === '' ? null : 'z:' + v; },
  gates: function (e) { if (!isObj(e)) return null; if (e.uid != null && e.uid !== '') return 'u:' + e.uid; if (e.id != null && e.id !== '') return 'g:' + e.id; if (e.gid != null && e.leafNo != null) return 'gl:' + e.gid + '/' + e.leafNo; if (e.gid != null) return 'gg:' + e.gid; if (e.num != null && e.num !== '') return 'gn:' + e.num; if (e.label) return 'gL:' + e.label; return null; },
  marks: function (e) { if (!isObj(e)) return null; if (e.uid != null && e.uid !== '') return 'u:' + e.uid; if (e.id != null && e.id !== '') return 'm:' + e.id; if (e.label) return 'mL:' + e.label; return null; },
  paths: function (e) { if (!isObj(e)) return null; if (e.uid != null && e.uid !== '') return 'u:' + e.uid; var v = e.id || e.code || e.name; return v == null || v === '' ? null : 'p:' + v; },
  floor: function (e, i) { if (!isObj(e)) return '#' + i; var v = e.sid || e.id; return v == null || v === '' ? '#' + i : 'f:' + v; },
  roundsFloor: function (fl, i) { fl = isObj(fl) ? fl : {}; if (fl.sid != null && fl.sid !== '') return 'f:' + fl.sid; return 'rounds:' + (fl.name || fl.num || ('#' + i)); }
};
var ENF_LENS_COLS = ['zones', 'gates', 'marks', 'paths'];
var ENF_FIELD_KEYS = ['fst', 'flow', 'fAt', 'fBy', 'fKind', 'fLog', 'closed', 'off', 'cAt', 'cAtMs', 'cWhy', 'cBy'];
var ENF_DIST_KEYS = ['emp', 'needN', 'needS', 'uniNeed'], ENF_DENS_KEYS = ['count', 'pc'];
function enfShallow(o) { var r = {}, q; for (q in o) r[q] = o[q]; return r; }
/* عنصرٌ كما يراه الفاعل: يُسقَط منه ما لا يراه (حالةُ الرصد خارج النطاق · التسكين بلا عدسة التوزيع · الكثافة بلا عدستها) */
function enfElemMask(V, col, e, site, rounds) {
  var mask = [], i;
  if (!isObj(e)) return mask;
  var stub = (site !== undefined && !V.siteOk(site)) || (V.restrict['Zone/Element'] && !V.zoneOk(ENF_ID[col](e)));
  if (!stub && rounds && V.restrict.Assigned && col !== 'paths') stub = !(Array.isArray(e.emp) && e.emp.map(String).indexOf(V.ekey) !== -1);
  if (stub && col !== 'paths') mask = mask.concat(ENF_FIELD_KEYS);
  if (!V.lens.dist && col !== 'paths') mask = mask.concat(ENF_DIST_KEYS);
  if (!V.lens.dens && col === 'zones') mask = mask.concat(ENF_DENS_KEYS);
  return mask;
}
function enfMaskApply(e, mask) { if (!mask.length || !isObj(e)) return e; var o = enfShallow(e); for (var i = 0; i < mask.length; i++) delete o[mask[i]]; return o; }
function enfMaskRestore(e, ce, mask) { if (!mask.length || !isObj(e) || !isObj(ce)) return e; var o = enfShallow(e), i, f; for (i = 0; i < mask.length; i++) { f = mask[i]; if (Object.prototype.hasOwnProperty.call(ce, f)) o[f] = ce[f]; else delete o[f]; } return o; }
/* حاوية عناصر (طابق خطة · طابق جولة · مرآة الجذر): إسقاط */
function enfFloorProj(V, fl, site, rounds) {
  if (!isObj(fl)) return fl;
  var o = enfShallow(fl), c, col, i;
  for (c = 0; c < ENF_LENS_COLS.length; c++) {
    col = ENF_LENS_COLS[c]; if (!Array.isArray(fl[col])) continue;
    if (!V.lens[col]) { o[col] = []; continue; }
    var out = []; for (i = 0; i < fl[col].length; i++) out.push(enfMaskApply(fl[col][i], enfElemMask(V, col, fl[col][i], site, rounds)));
    o[col] = out;
  }
  if (!V.lens.dens && Object.prototype.hasOwnProperty.call(o, 'dens')) delete o.dens;
  return o;
}
/* …ودمج: المحجوبُ يعود من القيمة الحالية (الخادمُ مرجعُه) — الجديدُ الذي لا نظيرَ له يبقى كما أرسله العميل فيُصنَّف ويُحكم */
function enfFloorMerge(V, nf, cf, site, rounds) {
  if (!isObj(nf) || !isObj(cf)) return nf;
  var o = enfShallow(nf), c, col, i;
  for (c = 0; c < ENF_LENS_COLS.length; c++) {
    col = ENF_LENS_COLS[c];
    if (!V.lens[col]) { if (cf[col] !== undefined) o[col] = cf[col]; else delete o[col]; continue; }
    if (!Array.isArray(nf[col]) || !Array.isArray(cf[col])) continue;
    var byId = {}; for (i = 0; i < cf[col].length; i++) { var id0 = ENF_ID[col](cf[col][i]); if (id0 != null && byId[id0] === undefined) byId[id0] = cf[col][i]; }
    var out = [];
    for (i = 0; i < nf[col].length; i++) {
      var e = nf[col][i], id = ENF_ID[col](e), ce = id != null ? byId[id] : undefined;
      out.push(ce !== undefined ? enfMaskRestore(e, ce, enfElemMask(V, col, ce, site, rounds)) : e);
    }
    o[col] = out;
  }
  if (!V.lens.dens) { if (Object.prototype.hasOwnProperty.call(cf, 'dens')) o.dens = cf.dens; else delete o.dens; }
  return o;
}
function enfMonthD(v) { return Array.isArray(v) ? { arr: true, d: v } : (isObj(v) && Array.isArray(v.d) ? { arr: false, d: v.d } : null); }
var ENF_PROJ = {
  /* المصدر: المسجدُ الذي لا يقرؤه الفاعل يُحجب بأيامه وأقفاله */
  'bassam_dstats_v1': {
    on: function (V) { return V.restrict.Source && !(V.sources.haram && V.sources.nabawi); },
    proj: function (v, V) {
      if (!isObj(v)) return v; var o = {}, q;
      for (q in v) {
        if ((q === 'haram' || q === 'nabawi') && !V.sources[q]) continue;
        if (q === 'locks' && isObj(v.locks)) { var L = {}, lk; for (lk in v.locks) { var s = String(lk).split('|')[0]; if ((s === 'haram' || s === 'nabawi') && !V.sources[s]) continue; L[lk] = v.locks[lk]; } o.locks = L; continue; }
        o[q] = v[q];
      }
      return o;
    },
    merge: function (c, n, V) {
      if (!isObj(n)) return n; c = isObj(c) ? c : {};
      var o = enfShallow(n), s, lk, L = isObj(n.locks) ? enfShallow(n.locks) : {}, hadL = Object.prototype.hasOwnProperty.call(n, 'locks') || isObj(c.locks);
      ['haram', 'nabawi'].forEach(function (s0) { if (V.sources[s0]) return; if (c[s0] !== undefined) o[s0] = c[s0]; else delete o[s0]; });
      for (lk in L) { s = String(lk).split('|')[0]; if ((s === 'haram' || s === 'nabawi') && !V.sources[s]) delete L[lk]; }
      if (isObj(c.locks)) for (lk in c.locks) { s = String(lk).split('|')[0]; if ((s === 'haram' || s === 'nabawi') && !V.sources[s]) L[lk] = c.locks[lk]; }
      if (hadL) o.locks = L;
      return o;
    }
  },
  /* الوردية (D4-09): صفوفُ الجدول الشهري لورديةٍ خارج نطاق الموظف تُحجب */
  'bassam_staffing_v3': {
    on: function (V) { return V.restrict.Shift && !V.ceil; },
    proj: function (v, V) {
      if (!isObj(v)) return v; var o = {}, mk, e;
      for (mk in v) {
        if (!isObj(v[mk]) || !/^\d{4}-\d{1,2}$/.test(mk)) { o[mk] = v[mk]; continue; }
        var m2 = {};
        for (e in v[mk]) { var r = v[mk][e]; if (e !== '__shifts' && isObj(r) && r.shift && !V.shiftOk(r.shift, mk)) continue; m2[e] = r; }
        o[mk] = m2;
      }
      return o;
    },
    merge: function (c, n, V) {
      if (!isObj(n) || !isObj(c)) return n; var o = enfShallow(n), mk, e;
      for (mk in c) {
        if (!isObj(c[mk]) || !/^\d{4}-\d{1,2}$/.test(mk)) continue;
        for (e in c[mk]) {
          var r = c[mk][e]; if (e === '__shifts' || !isObj(r) || !r.shift || V.shiftOk(r.shift, mk)) continue;
          if (!isObj(o[mk]) || o[mk] === n[mk]) o[mk] = isObj(n[mk]) ? enfShallow(n[mk]) : {};
          o[mk][e] = r;
        }
      }
      return o;
    }
  },
  /* الوردية: أقسامُ الورديات في التقرير اليومي خارج نطاق الموظف تُحجب */
  'bassam_dreport_v1': {
    on: function (V) { return V.restrict.Shift && !V.ceil; },
    proj: function (v, V) {
      if (!isObj(v)) return v; var o = {}, dk;
      for (dk in v) {
        var day = KIVO_SCOPE._h.parseDay(dk), x = v[dk];
        if (!day || !isObj(x) || !isObj(x.shifts)) { o[dk] = x; continue; }
        var s2 = {}, sh; for (sh in x.shifts) if (V.shiftOk(sh, day.y + '-' + day.m)) s2[sh] = x.shifts[sh];
        var x2 = enfShallow(x); x2.shifts = s2; o[dk] = x2;
      }
      return o;
    },
    merge: function (c, n, V) {
      if (!isObj(n) || !isObj(c)) return n; var o = enfShallow(n), dk, sh;
      for (dk in c) {
        var day = KIVO_SCOPE._h.parseDay(dk), x = c[dk];
        if (!day || !isObj(x) || !isObj(x.shifts)) continue;
        for (sh in x.shifts) {
          if (V.shiftOk(sh, day.y + '-' + day.m)) continue;
          if (!isObj(o[dk]) || o[dk] === n[dk]) { o[dk] = isObj(n[dk]) ? enfShallow(n[dk]) : enfShallow(x); o[dk].shifts = isObj(n[dk]) && isObj(n[dk].shifts) ? enfShallow(n[dk].shifts) : {}; }
          if (!isObj(o[dk].shifts)) o[dk].shifts = {};
          o[dk].shifts[sh] = x.shifts[sh];
        }
      }
      return o;
    }
  },
  /* الخطة: سياقُ رسم (لا يُحجب طابقٌ ولا عنصر) — يُسقَط ما خارج نطاق Site/Zone من حالة العناصر، وتُحجب العدساتُ المعطّلة وحقولُها */
  'bassam_plan_v1': {
    on: function (V) { return V.restrict.Site || V.restrict['Zone/Element'] || !V.lens.zones || !V.lens.gates || !V.lens.marks || !V.lens.paths || !V.lens.dist || !V.lens.dens; },
    proj: function (v, V) {
      if (!isObj(v)) return v; var o = enfShallow(v), i;
      if (Array.isArray(v.floors)) o.floors = v.floors.map(function (fl, i0) { return enfFloorProj(V, fl, ENF_ID.floor(fl, i0), false); });
      if (isObj(v.months)) { var mo = {}, k; for (k in v.months) { var md = enfMonthD(v.months[k]); if (!md) { mo[k] = v.months[k]; continue; } var dd = md.d.map(function (fl, i1) { return enfFloorProj(V, fl, ENF_ID.floor(fl, i1), false); }); if (md.arr) mo[k] = dd; else { mo[k] = enfShallow(v.months[k]); mo[k].d = dd; } } o.months = mo; }
      var root = enfFloorProj(V, { zones: v.zones, gates: v.gates, marks: v.marks, paths: v.paths }, V.restrict.Site ? '?' : undefined, false);
      for (i = 0; i < ENF_LENS_COLS.length; i++) if (v[ENF_LENS_COLS[i]] !== undefined) o[ENF_LENS_COLS[i]] = root[ENF_LENS_COLS[i]];
      return o;
    },
    merge: function (c, n, V) {
      if (!isObj(n) || !isObj(c)) return n; var o = enfShallow(n), i, k;
      if (Array.isArray(n.floors) && Array.isArray(c.floors)) {
        var cf = {}; c.floors.forEach(function (fl, i0) { cf[ENF_ID.floor(fl, i0)] = fl; });
        o.floors = n.floors.map(function (fl, i1) { var id = ENF_ID.floor(fl, i1), x = cf[id]; return x ? enfFloorMerge(V, fl, x, id, false) : fl; });
      }
      if (isObj(n.months) && isObj(c.months)) {
        var mo = enfShallow(n.months);
        for (k in n.months) {
          var mn = enfMonthD(n.months[k]), mc = enfMonthD(c.months[k]); if (!mn || !mc) continue;
          var cm = {}; mc.d.forEach(function (fl, i2) { cm[ENF_ID.floor(fl, i2)] = fl; });
          var dd = mn.d.map(function (fl, i3) { var id = ENF_ID.floor(fl, i3), x = cm[id]; return x ? enfFloorMerge(V, fl, x, id, false) : fl; });
          if (mn.arr) mo[k] = dd; else { mo[k] = enfShallow(n.months[k]); mo[k].d = dd; }
        }
        o.months = mo;
      }
      var rn0 = { zones: n.zones, gates: n.gates, marks: n.marks, paths: n.paths }, rc0 = { zones: c.zones, gates: c.gates, marks: c.marks, paths: c.paths };
      var rm = enfFloorMerge(V, rn0, rc0, V.restrict.Site ? '?' : undefined, false);
      for (i = 0; i < ENF_LENS_COLS.length; i++) { var col = ENF_LENS_COLS[i]; if (rm[col] !== undefined) o[col] = rm[col]; else delete o[col]; }
      return o;
    }
  },
  /* الجولات: كالخطة + راصدُ الميدان يرى حالةَ العناصر المسنَدة إليه وحدها (P4.2-05) — الحاوياتُ والهندسةُ وemp[] تبقى */
  'bassam_rounds_v1': {
    on: function (V) { return V.restrict.Site || V.restrict['Zone/Element'] || V.restrict.Assigned || !V.lens.zones || !V.lens.gates || !V.lens.marks || !V.lens.paths || !V.lens.dist || !V.lens.dens; },
    proj: function (v, V) {
      if (!isObj(v)) return v; var o = {}, dk;
      for (dk in v) {
        var x = v[dk];
        if (!KIVO_SCOPE._h.parseDay(dk) || !isObj(x) || !Array.isArray(x.d)) { o[dk] = x; continue; }
        var x2 = enfShallow(x); x2.d = x.d.map(function (fl, i) { return enfFloorProj(V, fl, ENF_ID.roundsFloor(fl, i), true); }); o[dk] = x2;
      }
      return o;
    },
    merge: function (c, n, V) {
      if (!isObj(n) || !isObj(c)) return n; var o = enfShallow(n), dk;
      for (dk in n) {
        var nx = n[dk], cx = c[dk];
        if (!KIVO_SCOPE._h.parseDay(dk) || !isObj(nx) || !isObj(cx) || !Array.isArray(nx.d) || !Array.isArray(cx.d)) continue;
        var x2 = enfShallow(nx); x2.d = nx.d.map(function (fl, i) { return i < cx.d.length ? enfFloorMerge(V, fl, cx.d[i], ENF_ID.roundsFloor(cx.d[i], i), true) : fl; }); o[dk] = x2;
      }
      return o;
    }
  }
};
/* الاسترشاد · المضبوطات: محاضرُ ورديةٍ خارج نطاق الموظف تُحجب (Site = loc خارج الترحيل — معلَن) */
ENF_PROJ['bassam_irshad_v1'] = ENF_PROJ['bassam_seized_v1'] = {
  on: function (V) { return V.restrict.Shift && !V.ceil; },
  hid: function (r, V) { return isObj(r) && r.shift && r.y != null && r.m != null && !V.shiftOk(r.shift, (+r.y) + '-' + (+r.m)); },
  proj: function (v, V) { if (!isObj(v) || !Array.isArray(v.reports)) return v; var self = this, o = enfShallow(v); o.reports = v.reports.filter(function (r) { return !ENF_PROJ['bassam_irshad_v1'].hid(r, V); }); return o; },
  merge: function (c, n, V) {
    if (!isObj(n) || !isObj(c) || !Array.isArray(c.reports)) return n;
    var H = ENF_PROJ['bassam_irshad_v1'].hid, hidden = c.reports.filter(function (r) { return H(r, V); }); if (!hidden.length) return n;
    var hid = {}; hidden.forEach(function (r) { if (r.id != null) hid[String(r.id)] = 1; });
    var o = enfShallow(n); o.reports = (Array.isArray(n.reports) ? n.reports : []).filter(function (r) { return !(isObj(r) && r.id != null && hid[String(r.id)]); }).concat(hidden);
    return o;
  }
};
ENF_PROJ['bassam_staffing_v2'] = ENF_PROJ['bassam_staffing_v3'];
/* مرجعياتُ الإسقاط لطلب: سجلّاتُ النطاق وجداولُ الورديات للإدارات المعنية */
async function enfRefsFor(env, depts, keys) {
  var out = { recs: {}, staffing: {} }, i, d;
  out.recs = await enfScopeRecs(env, depts, keys);
  for (i = 0; i < depts.length; i++) { d = depts[i]; if (!d || out.staffing[d] !== undefined) continue; var sk = 'bsdept:' + d + ':bassam_staffing_v3'; var raw = keys && Object.prototype.hasOwnProperty.call(keys, sk) ? keys[sk] : (keys ? null : await kvGet(env, 'kv', sk)); out.staffing[d] = parseJson(raw, null); }
  return out;
}
/* الإسقاطُ على نصّ قيمةٍ كما ستُرسل — يرمي عند الخطأ (fail-closed: المستدعي يرفض القراءة) */
function enfProjectStr(A, k, raw, refs) {
  if (raw == null || !A || A.u.role === 'super') return raw;
  var P = parseKey(k), rn = resName(k), PJ = ENF_PROJ[rn];
  if (!PJ) return raw;
  var V = enfViewCtx(A, P.dept || (A.u.deptId || ''), rn, refs);
  if (!PJ.on(V)) return raw;
  var v = parseJson(raw, undefined); if (v === undefined) throw new Error('enf-project-parse');
  var p = PJ.proj(v, V);
  return JSON.stringify(p);
}
/* الدمجُ عند الكتابة مع كشف العبث بالمحجوب: { v: القيمةُ بعد الدمج, hidden: هل في المرسَل ما لا يراه الفاعل }
   القاعدة: ما يرسله العميلُ يجب أن يساوي إسقاطَ ما سيُحفظ (proj(merge(cur, sent)) = sent). فإن زاد عليه
   (صفُّ ورديةٍ أخرى · حالةُ عنصرٍ خارج النطاق · عدسةٌ معطّلة · مصدرٌ لا يقرؤه · نسخةٌ قديمة قبل تغيّر نطاقه) ⇒ رفضٌ صريح (scope) لا إسقاطٌ صامت. */
function enfMergeChk(A, k, nextRaw, curRaw, refs) {
  var out = { v: nextRaw, hidden: false };
  if (nextRaw == null || curRaw == null || !A || A.u.role === 'super') return out;
  var P = parseKey(k), rn = resName(k), PJ = ENF_PROJ[rn];
  if (!PJ) return out;
  var V = enfViewCtx(A, P.dept || (A.u.deptId || ''), rn, refs);
  if (!PJ.on(V)) return out;
  var n = parseJson(nextRaw, undefined), c = parseJson(curRaw, undefined);
  if (n === undefined || c === undefined) throw new Error('enf-merge-parse');
  var m = PJ.merge(c, n, V);
  if (!deq(PJ.proj(JSON.parse(JSON.stringify(m)), V), n)) out.hidden = true;
  out.v = deq(m, c) ? curRaw : JSON.stringify(m);
  return out;
}
/* الدمجُ عند الكتابة: ما يحجبه الإسقاطُ عن الفاعل يُعاد من القيمة الحالية قبل التصنيف */
function enfMergeStr(A, k, nextRaw, curRaw, refs) {
  if (nextRaw == null || curRaw == null || !A || A.u.role === 'super') return nextRaw;
  var P = parseKey(k), rn = resName(k), PJ = ENF_PROJ[rn];
  if (!PJ) return nextRaw;
  var V = enfViewCtx(A, P.dept || (A.u.deptId || ''), rn, refs);
  if (!PJ.on(V)) return nextRaw;
  var n = parseJson(nextRaw, undefined), c = parseJson(curRaw, undefined);
  if (n === undefined || c === undefined) return nextRaw;
  var m = PJ.merge(c, n, V);
  var s = JSON.stringify(m);
  /* لا تغييرَ مرئيّ: إن ساوى الدمجُ القيمةَ الحاليةَ فالنصُّ الحاليُّ نفسُه (فيصير الحفظُ بلا أثرٍ لا تعارضاً) */
  return deq(m, c) ? curRaw : s;
}
