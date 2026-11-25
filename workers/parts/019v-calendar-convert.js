/* ══ V7 · 53 تقويم: الدالةُ النقية «هجري ⇐ ميلادي» (cal_api.md §4 · التصميم §3.1 · §3.3 · ق3–ق7 · ق10) — يستعملها الترحيل 0014 والاستيراد.
   نقيةٌ حتمية: لا تخزين ولا ساعة (اليومُ المرجعي T معامل). لا تبني مُنسِّقاً: كلُّ هجريٍّ من تقويم الخادم الواحد (016: calHDay · calHOf · calHMonthsOf ·
   calHMonthSpan · calHMonthLen). المدخلُ الميلادي يعود كما هو، فإعادةُ التحويل لا تغيّر شيئاً. المفتاحُ الذي لا يُعرف تحويله يعود null — المستدعي
   يوقف إدارته ويذكره بمساره (§3.1)، ولا يُسقطه بصمت. ══ */
function calHtoGDay(k) {
  var p = calGParse(k); if (!p || p.kind !== 'day') return null;
  var g = p.cal === 'g' ? calGKey(p.y, p.m, p.d) : calHDay(p.y, p.m, p.d);
  return g ? g + (p.suffix ? '-' + p.suffix : '') : null;
}
function calGMonthsOfH(y, m) {
  var s = calHMonthSpan(y, m), out = [], last = null; if (!s) return out;
  calGRange(s.from, s.to).forEach(function (k) { var g = calGMonthOf(k); if (last && last.g === g) last.days++; else { last = { g: g, days: 1 }; out.push(last); } });
  return out;
}
/* نطاقُ نافذةٍ أو سجلٍّ {y,m,d}: يوم ⇐ يوم · شهر (d غائب/null/'') ⇐ الشهران الميلاديان (ق7: النافذةُ تُكرَّر) · d = 0 (يومٌ غير معروف، ق10) ⇐ شهرُ اليوم الأول */
function calHtoGScope(s) {
  if (!s || typeof s !== 'object') return null;
  var y = +s.y, m = +s.m, d = s.d == null || s.d === '' ? null : +s.d, g;
  if (calYearCal(y) === 'g') return calGregOk(y, m, d == null ? 1 : d, true) ? [{ y: y, m: m, d: d }] : null;
  if (calYearCal(y) !== 'h') return null;
  if (d == null) { var L = calGMonthsOfH(y, m); return L.length ? L.map(function (x) { var q = calGParse(x.g); return { y: q.y, m: q.m, d: null }; }) : null; }
  g = calGParse(calHDay(y, m, d === 0 ? 1 : d)); if (!g) return null;
  return [{ y: g.y, m: g.m, d: d === 0 ? 0 : g.d }];
}
/* ق6: يومُ الشهر الهجري لمهمةٍ متكررة ⇐ يومُ الشهر الميلادي لأول موعدٍ قادم (في T أو بعده) · 'last' يبقى · 30 في شهرٍ من 29 ⇐ آخرُ يومه */
function calHtoGMd(md, T) {
  if (md === 'last') return 'last';
  var n = +md, h = calHOf(T), i, y, m, len, g; if (!(n >= 1 && n <= 30) || !h) return null;
  for (i = 0; i < 3; i++) {
    y = h.y + Math.floor((h.m - 1 + i) / 12); m = ((h.m - 1 + i) % 12) + 1; len = calHMonthLen(y, m); if (!len) return null;
    g = calHDay(y, m, Math.min(n, len)); if (g && calGCmp(g, T) >= 0) return calGParse(g).d;
  }
  return null;
}
/* الأشهرُ الهجرية في شهرٍ ميلادي، والأغلبية (ق4 · ق5): الأكثرُ أياماً، والتعادلُ للأسبق مع tie */
function calHMonthsOfG(gm) { return calHMonthsOf(gm).map(function (x) { return { h: x.y + '-' + x.m, y: x.y, m: x.m, days: x.days, from: x.from, to: x.to }; }); }
function calMajority(gm) {
  var L = calHMonthsOfG(gm), best = null, tie = false;
  L.forEach(function (x) { if (!best || x.days > best.days) { best = x; tie = false; } else if (x.days === best.days) tie = true; });
  return best ? { h: best.h, y: best.y, m: best.m, days: best.days, tie: tie } : null;
}
/* قاعدةُ dsLockedIn حرفاً (010 lockedIn) — لا تعرف التقويم: rec خامٌ (true/1/{ap,mo,dopen,dshut}) · T = {y,m,d} بتقويم rec */
function calNormLock(v) { if (v === true || v === 1) return { ap: 1 }; return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
function calLockedIn(rec, y, m, d, T) {
  rec = calNormLock(rec); if (rec.ap) return true;
  var mPast = !!T && (y < T.y || (y === T.y && m < T.m)), dPast = mPast || (!!T && y === T.y && m === T.m && d != null && d < T.d);
  if (mPast && !rec.mo) return true;
  if (d == null) return false;
  var o = rec.dopen, s = rec.dshut;
  return dPast ? !(o && typeof o === 'object' && o[d]) : !!(s && typeof s === 'object' && s[d]);
}
function calLockKind(rec, y, m, d, T) {
  rec = calNormLock(rec); if (rec.ap) return 'ap';
  var mPast = y < T.y || (y === T.y && m < T.m), dPast = mPast || (y === T.y && m === T.m && d < T.d);
  if (mPast && !rec.mo) return 'past';
  if (dPast) return rec.dopen && rec.dopen[d] ? 'open' : 'past';
  return rec.dshut && rec.dshut[d] ? 'shut' : '';
}
var CAL_LOCK_F = { ap: 1, mo: 1, auto: 1, dopen: 1, dshut: 1 };
function calSrcGet(src) { return typeof src === 'function' ? src : function (h) { var o = src || {}; return o[h] !== undefined ? o[h] : o['m:' + h]; }; }
/* §3.3 «السلوكُ اليومي المطابق»: سجلُّ m:gm الميلادي بحيث لكل يوم: calLockedIn(الجديد، اليومُ الميلادي، T) === calLockedIn(القديم، اليومُ الهجري، هجريُّ T)
   src(h) ⇐ القيمةُ الخامُ القديمة لعلامة الشهر الهجري 'y-m' (أو خريطةٌ بمفاتيح 'y-m' أو 'm:y-m') · T مفتاحُ اليوم التشغيلي الميلادي */
function calMonthRule(gm, src, T) {
  var get = calSrcGet(src), G = calGParse(gm), Tg = calGParse(T), Th = calHOf(T), days = [], srcs = {}, order = [], cnt = {}, i;
  if (!G || G.cal !== 'g' || G.kind === 'day' || !Tg || Tg.kind !== 'day' || !Th) return { rec: null, days: [], ok: false, extra: {}, err: 'cal-bad-arg' };
  var L = calGDays(calGYm(G.y, G.m));
  for (i = 0; i < L.length; i++) {
    var h = calHOf(L[i]); if (!h) return { rec: null, days: [], ok: false, extra: {}, err: 'cal-unknown-day' };
    var hk = h.y + '-' + h.m; if (!(hk in srcs)) { srcs[hk] = get(hk); order.push(hk); cnt[hk] = 0; } cnt[hk]++;
    days.push({ g: L[i], h: hk + '-' + h.d, locked: calLockedIn(srcs[hk], h.y, h.m, h.d, Th), why: calLockKind(srcs[hk], h.y, h.m, h.d, Th) });
  }
  var N = order.map(function (k) { return calNormLock(srcs[k]); }), all = function (f) { return N.every(function (r) { return !!r[f]; }); };
  var rec = {}, gPast = G.y * 12 + G.m < Tg.y * 12 + Tg.m, anyOpen = false;
  if (all('ap')) { rec.ap = 1; if (all('auto')) rec.auto = 1; }
  else {
    days.forEach(function (x, j) {
      var d = j + 1, past = gPast || (G.y === Tg.y && G.m === Tg.m && d < Tg.d);
      if (past && !x.locked) { (rec.dopen = rec.dopen || {})[d] = 1; anyOpen = true; }
      if (!past && x.locked) (rec.dshut = rec.dshut || {})[d] = 1;
    });
    if ((gPast && anyOpen) || all('mo')) rec.mo = 1;
  }
  /* بقيةُ الحقول (perm …) من مصدر الأغلبية، والمختلفُ يُذكر */
  var major = order.slice().sort(function (a, b) { return cnt[b] - cnt[a]; })[0], extra = {}, fs = {};
  N.forEach(function (r) { Object.keys(r).forEach(function (f) { if (!CAL_LOCK_F[f]) fs[f] = 1; }); });
  Object.keys(fs).forEach(function (f) {
    var vals = N.map(function (r) { return r[f]; }), mv = calNormLock(srcs[major])[f];
    if (mv !== undefined) rec[f] = mv;
    if (vals.some(function (v) { return JSON.stringify(v) !== JSON.stringify(vals[0]); })) extra[f] = vals;
  });
  var ok = days.every(function (x, j) { return calLockedIn(rec, G.y, G.m, j + 1, Tg) === x.locked; });
  return { rec: Object.keys(rec).length ? rec : null, days: days, ok: ok, extra: extra };
}
/* ق3 للسجلات بلا أيام (أقفالُ الجدول · أقفالُ شهر المهام · أقفالُ شهر الإحصائيات): معتمدٌ إن اعتُمدت كلُّ الأشهر الهجرية الداخلة · {mo:1} إن فُتحت كلُّها · وإلا لا شيء */
function calMonthLockRule(gm, src) {
  var get = calSrcGet(src), L = calHMonthsOfG(gm).map(function (x) { return get(x.h); });
  if (!L.length) return undefined;
  var ap = function (v) { return v === true || v === 1 || (!!v && typeof v === 'object' && !!v.ap); };
  if (L.every(ap)) return L.every(function (v) { return JSON.stringify(v) === JSON.stringify(L[0]); }) ? L[0] : true;
  if (L.every(function (v) { return !!v && typeof v === 'object' && !!v.mo; })) return { mo: 1 };
  return undefined;
}

/* ══ V7 · 53 تقويم (REVIEW 28): المحوِّلُ الواحد للبيانات المخزَّنة — الترحيلُ 0014 (019v1، منسِّقٌ رقيق) والاستيرادُ والاستعادة (019g · 019f) يستعملونه هو نفسُه،
   ولا محرّكَ تحويلٍ ثانٍ. فوق الدوالّ النقية أعلاه (calHtoGDay · calHtoGScope · calHtoGMd · calMonthRule · calMonthLockRule · calMajority · calHMonthsOfG):
   · كشفُ القيم وتحويلُها قيمةً قيمة: calConvDay (النصُّ الواحد) · calConvYmd (الثلاثيُّ الواحد) · calConvWalk · calConvRow (صفوفٌ علائقية) · calConvLeave · calConvOnce
   · قواعدُ الموارد (ق3–ق7 · ق10): calConvMarks · calConvDayMap · calConvLocks · calConvStaffing/StaffMonth · calConvPlan* · calConvDstats · calConvRasd · calConvDoc · calConvText
   · مداخلُ النسخ: calConvBackup · calConvDomains · calConvLegacyKV — ctx = { T: اليومُ التشغيلي الميلادي الثابت للعملية · rep: calConvRep() }.
   المفتاحُ الذي لا يُعرف تحويلُه يرمي calendar-unmapped باسم مساره، والمختلطُ calendar-mixed، والميلاديُّ يعود كما هو. ══ */
/* المواردُ يعلنها كلُّ نظامٍ في فتحته (019v0 CAL_CONV_SLOTS: مفتاح ⇐ نوع) — القاعدةُ لا تسمّي مفتاحَ نظام */
var CAL_CONV_OPS = { dayMap: 1, dayMapRec: 1, monthLocks: 1, monthStaff: 1, monthPlan: 1, dayKeys: 1, ymd: 1 };
function calConvKind(r) { return ocOwn(CAL_CONV_SLOTS, r) ? CAL_CONV_SLOTS[r] : ''; }
function calConvIs(resource) { return !!CAL_CONV_OPS[calConvKind(resource)]; }
function calConvError(code, path, status) { var e = rsError(code, status || 409); if (path) e.details = { at: e.path = String(path).slice(0, 200) }; return e; }   /* V7 · 53 تقويم (cal-import): الموضعُ في الردّ (details.at) — تعرضه المعاينة */
function calConvRep() { return { days: 0, months: 0, conflicts: [], recurring: [], major: [], locks: [], extra: [], custodyDay0: 0, retro: 0 }; }
function calConvClone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
/* القيمةُ الواحدة: نصٌّ هو يومٌ هجري (مبطَّن أو لا، ولاحقةُ الجولات) ⇐ يومُه الميلادي · يومٌ هجريٌّ لا وجود له ⇐ calendar-unmapped باسم مساره · غيرُ ذلك يعود كما هو.
   (cal-import يلفّ كاشفَه — dd/mm/yyyy · أرقامُ Excel · أسماءُ الأشهر · «هـ/م» — حول هذه الدالة) */
/* V7 · 53 تقويم (cal-import · شرطُ REVIEW 28): f = حقلُ يومٍ معروف — يقبل ISO الميلادي أو يوماً هجرياً وحدهما؛ نصٌّ آخر (dd/mm/yyyy من عميلٍ قديم أو طلبٍ مباشر) يُرفض بموضعه لا يُحفظ */
function calConvDay(v, path, f) {
  var p = typeof v === 'string' ? calGParse(v) : null; if (f && v && !p) throw calConvError('calendar-unmapped', path); if (!p || p.cal !== 'h' || p.kind !== 'day') return v;
  var g = calHtoGDay(v); if (!g) throw calConvError('calendar-unmapped', path || v); return g;
}
/* الثلاثيُّ الواحد: o[fy]/o[fm]/o[fd] بسنةٍ هجرية ⇐ ميلادي في مكانه (اليومُ الغائب ⇐ شهرُ يومه الأول · يومُ 0 يبقى 0، ق10 · نوعُ كل قيمةٍ كما كان) ⇒ true إن حوّل */
function calConvYmd(o, fy, fm, fd, path, rep) {
  if (!isObj(o) || o[fy] == null || calYearCal(+o[fy]) !== 'h' || !(+o[fm] >= 1 && +o[fm] <= 12)) return false;
  var d = o[fd] == null || o[fd] === '' ? null : +o[fd], s = calHtoGScope({ y: +o[fy], m: +o[fm], d: d }), same = function (old, n) { return typeof old === 'string' ? String(n) : n; };
  if (!s) throw calConvError('calendar-unmapped', path);
  o[fy] = same(o[fy], s[0].y); o[fm] = same(o[fm], s[0].m); if (d != null) o[fd] = same(o[fd], s[0].d);
  if (rep) { rep.days++; if (d === 0) rep.custodyDay0++; }
  return true;
}
function calConvFixed(resource) { var r = opRegistry()[resource], s = r && r.prepared.resources[resource].spec; return (s && s.fields) || {}; }
/* قيمةُ اليوم: كلُّ نصٍّ فيها هو يومٌ هجري ⇐ يومُه (dayMap) · ومعها مفتاحُ عدم التكرار وقاعدةُ التكرار الشهري ق6 (dayMapRec) */
function calConvStrs(v, path) {
  if (Array.isArray(v)) v.forEach(function (x, i) { if (typeof x === 'string') v[i] = calConvDay(x, path); else calConvStrs(x, path); });
  else if (isObj(v)) Object.keys(v).forEach(function (k) { var x = v[k]; if (typeof x === 'string') v[k] = calConvDay(x, path + '.' + k); else if (x && typeof x === 'object') calConvStrs(x, path); });
}
function calConvDayValue(resource, v, ctx, path) {
  if (v === null || typeof v !== 'object') return v;
  var x = calConvClone(v);
  if (calConvKind(resource) === 'dayMap') calConvStrs(x, path);
  else if (Array.isArray(x)) {
    x.forEach(function (row, i) {
      var m = Array.isArray(row) ? row[23] : null; if (!isObj(m)) return;
      if (typeof m.idem === 'string') m.idem = m.idem.replace(/^(r:[^:]*:)([^:]+)(:.*)?$/, function (all, a, d, b) { return a + calConvDay(d, path + '[' + i + '].idem', 1) + (b || ''); });
      var r = m.rec; if (!isObj(r)) return;
      if (typeof r.from === 'string') r.from = calConvDay(r.from, path + '[' + i + '].rec.from', 1);
      if (typeof r.to === 'string') r.to = calConvDay(r.to, path + '[' + i + '].rec.to', 1);
      if (r.t === 'monthly' && r.md !== 'last' && r.md != null && !r.calMd) {
        var md = calHtoGMd(r.md, ctx.T); if (md == null) throw calConvError('calendar-unmapped', path + '[' + i + '].rec.md');
        if (ctx.rep && !ctx.rep.recurring.some(function (q) { return q.id === r.id; })) ctx.rep.recurring.push({ id: r.id, from: r.md, to: md });
        r.md = md;
      }
    });
  }
  return x;
}
/* علاماتُ الأشهر m: (ق3، §3.3): الأشهرُ الميلادية التي تمسّها العلاماتُ الهجرية ⇐ سجلٌّ يحفظ قفلَ كلِّ يوم (calMonthRule) — أو لا شيء إن طابق الافتراض */
function calConvMarks(src, ctx, label) {
  var months = {}, out = {};
  Object.keys(src).forEach(function (h) { var p = h.split('-'); calGMonthsOfH(+p[0], +p[1]).forEach(function (x) { months[x.g] = 1; }); });
  Object.keys(months).sort().forEach(function (gm) {
    var r = calMonthRule(gm, src, ctx.T);
    if (!r.ok) throw calConvError('calendar-rule', label + '/m:' + gm);
    if (Object.keys(r.extra || {}).length && ctx.rep) ctx.rep.extra.push({ at: label + '/m:' + gm, extra: r.extra });
    if (r.rec) ocSet(out, 'm:' + gm, r.rec);
    if (ctx.rep) ctx.rep.months++;
  });
  return out;
}
/* خريطةُ أيامٍ (الجولات وأرشيفها · التقرير · المهام · dayshift): الحقولُ الثابتة أولاً بترتيبها · العلاماتُ مرتّبة · الأيامُ بترتيب الأصل */
function calConvDayMap(resource, doc, ctx) {
  if (!isObj(doc)) return doc;
  var fixed = calConvFixed(resource), out = {}, marks = {}, gm = {}, days = [], seen = {};
  Object.keys(doc).forEach(function (k) {
    if (ocOwn(fixed, k)) { ocSet(out, k, doc[k]); return; }
    var p = calGParse(k); if (!p || (p.kind !== 'day' && p.kind !== 'mctl')) throw calConvError('calendar-unmapped', resource + '/' + k);
    seen[p.cal] = 1;
    if (p.kind === 'mctl') { if (p.cal === 'h') marks[p.y + '-' + p.m] = doc[k]; else ocSet(gm, k, doc[k]); }
    else days.push(k);
  });
  if (seen.h && seen.g) throw calConvError('calendar-mixed', resource);
  var conv = seen.h ? calConvMarks(marks, ctx, resource) : gm;
  Object.keys(conv).forEach(function (k) { ocSet(out, k, conv[k]); });
  days.forEach(function (k) {
    var g = seen.h ? calConvDay(k, resource + '/' + k) : k;
    if (ocOwn(out, g)) throw calConvError('calendar-collision', resource + '/' + k);
    ocSet(out, g, seen.h ? calConvDayValue(resource, doc[k], ctx, resource + '/' + k) : doc[k]);
    if (seen.h && ctx.rep) ctx.rep.days++;
  });
  return out;
}
/* سجلاتُ أشهرٍ بلا أيام (أقفالُ الجدول · أقفالُ المهام): الشهرُ ⇐ calMonthLockRule · قفلُ اليوم 'y-m-d' ينتقل يوماً بيوم */
function calConvLocks(resource, doc, ctx) {
  if (!isObj(doc)) return doc;
  var src = {}, out = {}, seen = {}, months = {}, days = [];
  Object.keys(doc).forEach(function (k) {
    var p = calGParse(k); if (!p || p.kind === 'mctl') throw calConvError('calendar-unmapped', resource + '/' + k);
    seen[p.cal] = 1;
    if (p.kind === 'month') { if (p.cal === 'h') { src[p.y + '-' + p.m] = doc[k]; calGMonthsOfH(p.y, p.m).forEach(function (x) { months[x.g] = 1; }); } else ocSet(out, k, doc[k]); }
    else days.push(k);
  });
  if (seen.h && seen.g) throw calConvError('calendar-mixed', resource);
  Object.keys(months).sort().forEach(function (gm) {
    var v = calMonthLockRule(gm, src), L = calHMonthsOfG(gm).map(function (x) { return src[x.h]; });
    if (ctx.rep && L.some(function (x) { return JSON.stringify(x) !== JSON.stringify(L[0]); })) ctx.rep.locks.push({ res: resource, g: gm, from: calHMonthsOfG(gm).map(function (x) { return x.h; }), v: v === undefined ? null : v });
    if (v !== undefined) ocSet(out, gm, v);
    if (ctx.rep) ctx.rep.months++;
  });
  days.forEach(function (k) { ocSet(out, seen.h ? calConvDay(k, resource + '/' + k) : k, doc[k]); });
  return out;
}
/* إجازةٌ {fd,fm,fy,td,tm,ty,kind} بتاريخين هجريين مفكّكين ⇐ ميلادية (السنةُ الغائبة سنةُ شهرها، والمدى الذي يعبر السنة يأخذ السنةَ التالية) */
function calConvLeave(lv, hy, path) {
  if (!isObj(lv)) return null;
  var fy = lv.fy != null && lv.fy !== '' ? +lv.fy : hy, ty = lv.ty != null && lv.ty !== '' ? +lv.ty : (+lv.tm < +lv.fm ? fy + 1 : fy);
  if (calYearCal(fy) === 'g') return { lv: lv, a: calGKey(fy, +lv.fm, +lv.fd), b: calGKey(ty, +lv.tm, +lv.td) };
  var a = calHDay(fy, +lv.fm, +lv.fd), b = calHDay(ty, +lv.tm, +lv.td); if (!a || !b) throw calConvError('calendar-unmapped', path);
  var A = calGParse(a), B = calGParse(b), o = {};
  Object.keys(lv).forEach(function (k) { o[k] = lv[k]; });
  o.fd = A.d; o.fm = A.m; o.fy = A.y; o.td = B.d; o.tm = B.m; o.ty = B.y;
  return { lv: o, a: a, b: b };
}
var CAL_CONV_Q4 = ['shift', 'muk', 'cs'];
/* ق4: شهرٌ ميلادي من الجدول ⇐ وردياتُ الشهر الهجري الأكثر أياماً فيه (calMajority) · الإجازاتُ والأذونات بالأيام بدقة من كل مصدر · والتعارضُ يُذكر */
function calConvStaffMonth(gm, srcs, ctx, path) {
  var L = calHMonthsOfG(gm).filter(function (x) { return ocOwn(srcs, x.h) && isObj(srcs[x.h]); }); if (!L.length) return undefined;
  var maj = calMajority(gm), order = L.slice().sort(function (a, b) { return b.days - a.days || (a.h === maj.h ? -1 : b.h === maj.h ? 1 : 0); }), out = {}, q4 = [], G = calGParse(gm);
  var shiftsFrom = order.filter(function (x) { return ocOwn(srcs[x.h], '__shifts'); })[0];
  var emps = [];
  order.forEach(function (x) { Object.keys(srcs[x.h]).forEach(function (e) { if (e.indexOf('__') !== 0 && emps.indexOf(e) < 0) emps.push(e); }); });
  if (shiftsFrom) {
    ocSet(out, '__shifts', calConvClone(srcs[shiftsFrom.h].__shifts));
    order.forEach(function (x) { if (x !== shiftsFrom && ocOwn(srcs[x.h], '__shifts') && JSON.stringify(srcs[x.h].__shifts) !== JSON.stringify(srcs[shiftsFrom.h].__shifts)) q4.push({ e: '__shifts', f: '__shifts', a: srcs[shiftsFrom.h].__shifts, b: srcs[x.h].__shifts, ha: shiftsFrom.h, hb: x.h, pick: 'a', tie: maj.tie ? 1 : 0 }); });
  }
  emps.forEach(function (e) {
    var have = order.filter(function (x) { return isObj(srcs[x.h][e]); }), pick = have[0];
    if (!pick) { ocSet(out, e, calConvClone(srcs[order.filter(function (x) { return ocOwn(srcs[x.h], e); })[0].h][e])); return; }
    var rec = calConvClone(srcs[pick.h][e]), perms = [], permNum = true, permAny = false, leaves = [], seen = {};
    have.forEach(function (x) {
      var r = srcs[x.h][e];
      if (x !== pick) CAL_CONV_Q4.forEach(function (f) { if (JSON.stringify(r[f]) !== JSON.stringify(rec[f])) q4.push({ e: e, f: f, a: rec[f] === undefined ? null : rec[f], b: r[f] === undefined ? null : r[f], ha: pick.h, hb: x.h, pick: 'a', tie: maj.tie ? 1 : 0 }); });
      if (Array.isArray(r.perm)) { permAny = true; r.perm.forEach(function (d) { if (typeof d !== 'number') permNum = false; var g = calHDay(x.y, x.m, +d); if (!g) throw calConvError('calendar-unmapped', path + '/' + e + '/perm/' + d); var P = calGParse(g); if (P.y === G.y && P.m === G.m && perms.indexOf(P.d) < 0) perms.push(P.d); }); }
      if (Array.isArray(r.leaves)) r.leaves.forEach(function (lv, i) {
        var c = calConvLeave(lv, x.y, path + '/' + e + '/leaves/' + i); if (!c) return;
        var first = gm + '-01', last = calGKey(G.y, G.m, calGMonthDays(G.y, G.m)), id = JSON.stringify(c.lv);
        if (calGCmp(c.b, first) >= 0 && calGCmp(c.a, last) <= 0 && !seen[id]) { seen[id] = 1; leaves.push(c.lv); }
      });
    });
    if (permAny) rec.perm = perms.sort(function (a, b) { return a - b; }).map(function (d) { return permNum ? d : String(d); });
    if (Array.isArray(rec.leaves) || leaves.length) rec.leaves = leaves;
    ocSet(out, e, rec);
  });
  if (q4.length && ctx.rep) ctx.rep.conflicts.push({ g: gm, n: q4.length, items: q4.slice(0, 20) });   /* الملخّصُ مختصر — القائمةُ كاملةً في الشهر نفسِه (__calq4) */
  /* القائمةُ مع شهرها في الجدول نفسِه حيث يراها مديرُ الإدارة (cal_api: __calq4) — إن عرفها المخطّط؛ وإلا ففي ملخّص الترحيل وحده */
  if (q4.length && ocOwn(calConvBucketFixed(String(path).split('/')[0]), '__calq4')) ocSet(out, '__calq4', q4);
  return out;
}
function calConvBucketFixed(res) { var e = opRegistry()[res], s = e && e.prepared.resources[res].spec; return (s && s.entry && s.entry.fields) || {}; }
/* أشهرُ الجدول (v3: كلُّ مفتاحٍ شهر · v2: مفاتيحُ الأشهر بنمطها، وغيرُها صفوفُ موظفين تبقى) */
function calConvStaffing(resource, doc, ctx) {
  if (!isObj(doc)) return doc;
  var src = {}, keep = {}, months = {}, seen = {}, out = {};
  Object.keys(doc).forEach(function (k) {
    var p = calGParse(k);
    if (!p || p.kind !== 'month') { ocSet(keep, k, doc[k]); return; }   /* ليس شهراً (صفوفُ الموظفين في الجدول القديم) يبقى كما هو */
    seen[p.cal] = 1;
    if (p.cal === 'g') { ocSet(keep, k, doc[k]); return; }
    src[p.y + '-' + p.m] = doc[k]; calGMonthsOfH(p.y, p.m).forEach(function (x) { months[x.g] = 1; });
  });
  if (seen.h && seen.g) throw calConvError('calendar-mixed', resource);
  Object.keys(keep).forEach(function (k) { if (!calGParse(k)) ocSet(out, k, keep[k]); });
  Object.keys(months).sort().forEach(function (gm) { var b = calConvStaffMonth(gm, src, ctx, resource + '/' + gm); if (b !== undefined) { ocSet(out, gm, b); if (ctx.rep) ctx.rep.months++; } });
  Object.keys(keep).forEach(function (k) { if (calGParse(k)) ocSet(out, k, keep[k]); });
  return out;
}
/* ق5: months.{ym} ⇐ خطةُ الشهر الهجري الأكثر أياماً (قد تتكرر في شهرين) · delMonths.{ym} للشهر الميلادي إن حُذفت مصادرُه كلُّها */
function calConvPlanMonth(gm, src, ctx) {
  var L = calHMonthsOfG(gm).filter(function (x) { return ocOwn(src, x.h); }); if (!L.length) return undefined;
  var maj = calMajority(gm), best = L.slice().sort(function (a, b) { return b.days - a.days || (a.h === maj.h ? -1 : b.h === maj.h ? 1 : 0); })[0];
  if (ctx.rep && (L.length > 1 || maj.tie)) ctx.rep.major.push({ g: gm, from: best.h, also: L.filter(function (x) { return x !== best; }).map(function (x) { return x.h; }), tie: maj.tie ? 1 : 0 });
  return calConvClone(src[best.h]);
}
function calConvPlanMap(map, ctx, all, label) {
  if (!isObj(map)) return map;
  var src = {}, months = {}, seen = {}, out = {};
  Object.keys(map).forEach(function (k) { var p = calGParse(k); if (!p || p.kind !== 'month') throw calConvError('calendar-unmapped', label + '/' + k); seen[p.cal] = 1; if (p.cal === 'g') ocSet(out, k, map[k]); else { src[p.y + '-' + p.m] = map[k]; calGMonthsOfH(p.y, p.m).forEach(function (x) { months[x.g] = 1; }); } });
  if (seen.h && seen.g) throw calConvError('calendar-mixed', label);
  Object.keys(months).sort().forEach(function (gm) {
    if (all) { var L = calHMonthsOfG(gm); if (L.every(function (x) { return ocOwn(src, x.h); })) ocSet(out, gm, calConvClone(src[calMajority(gm).h])); return; }
    var v = calConvPlanMonth(gm, src, ctx); if (v !== undefined) { ocSet(out, gm, v); if (ctx.rep) ctx.rep.months++; }
  });
  return out;
}
function calConvPlan(doc, ctx) {
  if (!isObj(doc)) return doc;
  var out = {};
  Object.keys(doc).forEach(function (k) { ocSet(out, k, k === 'months' ? calConvPlanMap(doc.months, ctx, false, 'plan/months') : k === 'delMonths' ? calConvPlanMap(doc.delMonths, ctx, true, 'plan/delMonths') : doc[k]); });
  return out;
}
/* الدالةُ الواحدة للمورد كلِّه (الاستيراد · المرحلة ٢ للموارد الصغيرة) */
function calConvDoc(resource, doc, ctx) {
  if (doc === undefined || doc === null || !calConvIs(resource)) return doc;
  var kd = calConvKind(resource);
  if (kd === 'dayMap' || kd === 'dayMapRec') return calConvDayMap(resource, doc, ctx);
  if (kd === 'dayKeys') { if (!isObj(doc)) return doc; var o = {}, h = Object.keys(doc).some(function (k) { return calKeyCal(k) === 'h'; }); Object.keys(doc).forEach(function (k) { ocSet(o, h ? calConvDay(k, resource + '/' + k) : k, doc[k]); }); return o; }
  if (kd === 'monthLocks') return calConvLocks(resource, doc, ctx);
  if (kd === 'monthStaff') return calConvStaffing(resource, doc, ctx);
  if (kd === 'monthPlan') return calConvPlan(doc, ctx);
  if (kd === 'ymd') { var f = calConvClone(doc); return calConvYmd(f, 'y', 'm', 'd', resource, null) ? f : doc; }
  return doc;
}
/* نصُّ وثيقةٍ (الاستيراد): يعيد النصَّ نفسَه إن لم يتغيّر شيء */
function calConvText(resource, text, ctx) {
  if (typeof text !== 'string' || !calConvIs(resource)) return text;
  var v = parseJson(text, undefined); if (v === undefined || v === null) return text;
  var out = calConvDoc(resource, v, ctx), t = JSON.stringify(out);
  return t === JSON.stringify(v) ? text : t;
}
/* مفاتيحُ «مرّةً واحدة» (dedup): كلُّ رمزِ يومٍ هجريٍّ ⇐ يومُه الميلادي · رمزُ شهرٍ ⇐ كلُّ شهرٍ ميلاديٍّ يمسّه (فلا يتكرر تنبيهٌ يومَ الترحيل — الخطر ٣) */
function calConvOnce(k) {
  var outs = [''], rx = /(\d{4})-(\d{1,2})(?:-(\d{1,2}))?(?![\d])/g, last = 0, m, hit = false;
  while ((m = rx.exec(k))) {
    if (calYearCal(+m[1]) !== 'h' || (m.index > 0 && /\d/.test(k.charAt(m.index - 1)))) continue;
    var pre = k.slice(last, m.index), rep;
    if (m[3] != null) { var g = calHDay(+m[1], +m[2], +m[3]); if (!g) continue; rep = [g]; }
    else { rep = calGMonthsOfH(+m[1], +m[2]).map(function (x) { return x.g; }); if (!rep.length) continue; }
    hit = true;
    var next = []; outs.forEach(function (o) { rep.forEach(function (r) { next.push(o + pre + r); }); }); outs = next; last = m.index + m[0].length;
  }
  return hit ? outs.map(function (o) { return o + k.slice(last); }) : [];
}
/* الرصد (KV الإدارة): reports[].{y,m,d} ⇐ ميلادية · نوافذُه windows[].scope: يوم ⇐ يومه · شهرٌ ساري ⇐ يُكرَّر في الشهرين (ق7) · غيرُه ⇐ شهرُ يومه الأول */
function calConvRasd(v, now, k) {
  var changed = false; if (!isObj(v)) return false;
  if (Array.isArray(v.reports)) v.reports.forEach(function (r, j) { if (calConvYmd(r, 'y', 'm', 'd', k + ' reports[' + j + ']', null)) changed = true; });
  if (Array.isArray(v.windows)) {
    var add = [];
    v.windows.forEach(function (w, j) {
      if (!isObj(w) || !isObj(w.scope) || calYearCal(+w.scope.y) !== 'h') return;
      var s = calHtoGScope(w.scope); if (!s) throw calConvError('calendar-unmapped', k + ' windows[' + j + ']');
      if (!w.closedAt && +w.until > now) s.slice(1).forEach(function (x, n) { var c = calConvClone(w); c.id = String(w.id) + '~g' + (n + 2); c.scope = Object.assign({}, w.scope, { y: x.y, m: x.m, d: x.d }); add.push(c); });
      w.scope = Object.assign({}, w.scope, { y: s[0].y, m: s[0].m, d: s[0].d }); changed = true;
    });
    v.windows = v.windows.concat(add);
  }
  return changed;
}
/* صفٌّ علائقيٌّ من نسخة (الاسترشاد · المضبوطات · العهد · الجائزة): (y,m,d) و«التاريخ» نصاً ⇐ ميلادية بأسماء أعمدته كما هي (hijri_* قبل cal-rest أو greg_* بعده) */
function calConvRow(row, rep, at) {
  if (!isObj(row)) return;
  ['greg_', 'hijri_'].forEach(function (p) {
    calConvYmd(row, p + 'year', p + 'month', p + 'day', at, rep);
    if (ocOwn(row, p + 'date')) row[p + 'date'] = calConvDay(row[p + 'date'], at);
  });
}
/* الإحصائياتُ في النسخ (dailyStats.data = { haram|nabawi: {'YYYY-MM-DD': يوم}, locks: {'site|y-m': true|{ap,mo,dopen,dshut}} }) */
function calConvDstats(data, ctx) {
  if (!isObj(data)) return data;
  var out = {}, src = {};
  Object.keys(data).forEach(function (s) {
    if (s === 'locks') return;
    var m = data[s]; if (!isObj(m)) { out[s] = m; return; }
    var o = {}; Object.keys(m).forEach(function (k) { ocSet(o, calKeyCal(k) === 'h' ? calConvDay(k, 'dailyStats/' + s + '/' + k) : k, m[k]); if (calKeyCal(k) === 'h' && ctx.rep) ctx.rep.days++; }); out[s] = o;
  });
  if (isObj(data.locks)) {
    var L = {}, months = {};
    Object.keys(data.locks).forEach(function (k) {
      var q = /^(\w+)\|(\d{4})-(\d{1,2})$/.exec(k); if (!q) throw calConvError('calendar-unmapped', 'dailyStats/locks/' + k);
      if (calYearCal(+q[2]) !== 'h') { L[k] = data.locks[k]; return; }
      (src[q[1]] = src[q[1]] || {})[(+q[2]) + '-' + (+q[3])] = data.locks[k]; calGMonthsOfH(+q[2], +q[3]).forEach(function (x) { months[q[1] + '|' + x.g] = 1; });
    });
    Object.keys(months).sort().forEach(function (sk) {
      var site = sk.split('|')[0], gm = sk.split('|')[1], r = calMonthRule(gm, src[site], ctx.T); if (!r.ok) throw calConvError('calendar-rule', 'dailyStats/locks/' + sk);
      if (!r.rec) return;
      var all = calHMonthsOfG(gm).every(function (x) { return src[site][x.h] === true; });
      L[sk] = all && r.rec.ap && Object.keys(r.rec).length <= 2 ? true : r.rec;
    });
    out.locks = L;
  }
  return out;
}
/* نسخةٌ (استيرادٌ أو استعادة — 019f rsConvertBackup): كلُّ موردٍ تقويميٍّ في keys وكلُّ صفٍّ علائقيٍّ في domains ⇐ ميلادي بالقاعدة نفسِها (ق12) */
function calConvBackup(keys, domains, summary, T, rep0) {
  var rep = rep0 || calConvRep(), ctx = { T: T, rep: rep }, now = Date.now();
  Object.keys(keys || {}).forEach(function (k) {
    var r = resName(k);
    if (calConvIs(r)) keys[k] = calConvText(r, keys[k], ctx);
    else if (calConvKind(r) === 'retroDoc' && typeof keys[k] === 'string') { var v = parseJson(keys[k], null); if (calConvRasd(v, now, k)) keys[k] = JSON.stringify(v); }
  });
  calConvDomains(domains, rep, T);
  if (summary) summary.calendar = calConvSummaryText(rep);
  return rep;
}
/* صفوفُ مجالاتٍ علائقية في نسخةٍ حديثة صُدِّرت قبل 0014: أسماءُ أعمدتها hijri_* ⇐ greg_* (ق2) وقيمُها ⇐ ميلادية — قبل التحقّق من شكلها */
function calConvDomains(domains, rep, T) {
  Object.keys(domains || {}).forEach(function (n) {   /* كلُّ مجالٍ علائقيٍّ في النسخة (مصفوفةُ نطاقاتٍ بصفوف) — بلا تسمية */
    (Array.isArray(domains[n]) ? domains[n] : []).forEach(function (dom) {
      if (!dom || !isObj(dom.rows)) return;
      Object.keys(dom.rows).forEach(function (t) {
        (Array.isArray(dom.rows[t]) ? dom.rows[t] : []).forEach(function (row, i) {
          if (!isObj(row)) return;
          calConvRow(row, rep, n + '/' + t + '[' + i + ']');
          Object.keys(row).forEach(function (c) { var m = /^hijri_(year|month|day|date)$/.exec(c); if (m && !ocOwn(row, 'greg_' + m[1])) { row['greg_' + m[1]] = row[c]; delete row[c]; } });
        });
      });
    });
  });
  if (domains && domains.dailyStats && isObj(domains.dailyStats.data)) domains.dailyStats.data = calConvDstats(domains.dailyStats.data, { T: T || calToday(Date.now()).k, rep: rep });
  return rep;
}
/* وثائقُ KV القديمة للمجالات العلائقية (بشكل Production — قبل جداولها): كلُّ {y,m,d} بسنةٍ هجرية ⇐ ميلادي (الشهرُ بلا يوم ⇐ شهرُ يومه الأول · يومُ 0 يبقى، ق10)
   وكلُّ نصٍّ هو مفتاحُ يومٍ هجري ⇐ يومُه الميلادي. الإحصائياتُ بقاعدة أقفالها (ق3). تُحوَّل قبل bc.convert.* فيتحقّق المحوِّلُ من قيمٍ ميلادية */
function calConvWalk(v, rep, path) {
  if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) { if (typeof v[i] === 'string') v[i] = calConvDay(v[i], path + '[' + i + ']'); else calConvWalk(v[i], rep, path + '[' + i + ']'); } return; }
  if (!isObj(v)) return;
  calConvYmd(v, 'y', 'm', 'd', path, rep);
  Object.keys(v).forEach(function (k) { var x = v[k]; if (typeof x === 'string') v[k] = calConvDay(x, path + '.' + k); else if (x && typeof x === 'object') calConvWalk(x, rep, path + '.' + k); });
}
function calConvLegacyKV(keys, T, rep) {
  Object.keys(keys || {}).forEach(function (k) {
    var r = resName(k), raw = keys[k]; if (typeof raw !== 'string') return;
    if (calConvKind(r) === 'statsDoc') { var ds = parseJson(raw, null); if (isObj(ds)) { var o = calConvDstats(ds, { T: T, rep: rep }); if (JSON.stringify(o) !== raw) keys[k] = JSON.stringify(o); } return; }
    if (calConvKind(r) !== 'legacyKv') return;
    var v = parseJson(raw, null); if (v === null || typeof v !== 'object') return;
    var before = JSON.stringify(v); calConvWalk(v, rep, k); var after = JSON.stringify(v); if (after !== before) keys[k] = after;
  });
  return rep;
}
/* سطرُ الملخّص قبل التأكيد (التصميم §4): «حُوِّل إلى الميلادي: n يوماً · m شهراً · k تعارضاً» — الأرقامُ والأسماءُ للواجهة (548) */
function calConvSummaryText(rep) {
  return { days: rep.days, months: rep.months, conflicts: rep.conflicts.reduce(function (n, c) { return n + c.n; }, 0), conflictMonths: rep.conflicts.map(function (c) { return c.g; }),
    recurring: rep.recurring.slice(0, 50), plan: rep.major.map(function (x) { return x.g; }), custodyDay0: rep.custodyDay0 };
}
function calConvMergeRep(a, b) { if (!b) return a; a.days += b.days || 0; a.months += b.months || 0; a.custodyDay0 += b.custodyDay0 || 0; ['conflicts', 'recurring', 'major', 'locks', 'extra'].forEach(function (f) { (b[f] || []).forEach(function (x) { a[f].push(x); }); }); return a; }
