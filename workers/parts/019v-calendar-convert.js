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
function calHtoGMonth(k) {
  var p = calGParse(k); if (!p || (p.kind !== 'month' && p.kind !== 'mctl')) return null;
  var pre = p.kind === 'mctl' ? 'm:' : '';
  if (p.cal === 'g') return [pre + calGYm(p.y, p.m)];
  var L = calGMonthsOfH(p.y, p.m);
  return L.length ? L.map(function (x) { return pre + x.g; }) : null;
}
function calHtoGKey(k) {
  var p = calGParse(k); if (!p) return null;
  var out = p.kind === 'day' ? calHtoGDay(k) : calHtoGMonth(k);
  return out ? { kind: p.kind, cal: p.cal, out: out } : null;
}
function calHtoGRange(from, to) {
  var a = calHtoGDay(from), b = calHtoGDay(to); if (!a || !b) return null;
  a = a.slice(0, 10); b = b.slice(0, 10);
  return calGCmp(a, b) <= 0 ? { from: a, to: b } : null;
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
function calWhy(rec, y, m, d, T) {
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
    days.push({ g: L[i], h: hk + '-' + h.d, locked: calLockedIn(srcs[hk], h.y, h.m, h.d, Th), why: calWhy(srcs[hk], h.y, h.m, h.d, Th) });
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
