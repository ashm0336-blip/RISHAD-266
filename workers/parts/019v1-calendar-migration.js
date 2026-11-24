/* ══ V7 · 53 تقويم: الترحيل 0014 (التصميم §3 · §4 · ق2–ق12) — قواعدُ الموارد فوق الدالة النقية لـcal-base (019v: calHtoGDay · calHtoGMonth · calHtoGScope ·
   calHtoGMd · calMonthRule · calMonthLockRule · calMajority · calHMonthsOfG). لا تحويلَ ثانٍ هنا: كلُّ يومٍ ميلاديٍّ من calHDay وحدها.
   ① calMigDoc(resource, doc, ctx) — وثيقةُ موردٍ تشغيليٍّ هجريةٌ كاملة (أو دفعةٌ منها) ⇐ ميلادية، يستعملها الاستيرادُ (019g) والمرحلةُ ٢ معاً، بالقاعدة نفسِها حرفاً.
      ctx = { T: اليومُ التشغيلي الميلادي 'YYYY-MM-DD' (لحظةُ الترحيل أو بدءُ الاستيراد — ثابتٌ للعملية كلِّها) · rep: ما يُذكر في الملخّص }.
      المفتاحُ الذي لا يُعرف تحويلُه يرمي calendar-unmapped باسم مساره، ولا يُسقط. الوثيقةُ الميلادية تعود كما هي، والمختلطةُ تُرفض (calendar-mixed).
   ② calMigPrepare(env) — خطةُ بيانات المرحلة ١ (052 migrateDb): جدولُ المطابقة · أقفالُ الإحصائيات (ق3) · نوافذُ الاستدراك (ق7) · الرصد (KV) · dedup.
   ③ calMigRoute — المرحلة ٢: POST /api/operations/calendar-migrate {dept|'all'} (مديرُ المنصة) — إدارةً إدارة، دفعاتٌ ذرّية صغيرة، قابلةٌ للاستئناف من حالتها. ══ */
var CAL_MIG_PENDING = 'cal_ops_pending', CAL_MIG_TKEY = 'cal_mig_t', CAL_MIG_SUM = 'cal_migration_summary:';
var CAL_MIG_RES = ['bassam_rounds_v1', 'bassam_rounds_arc_v1', 'bassam_dreport_v1', 'bassam_tasks_v1', 'bassam_tasks_locks_v1', 'bassam_staffing_v3', 'bassam_staffing_v2', 'bassam_staffing_locks_v1', 'bassam_plan_v1', 'bassam_dayshift_v1', 'bassam_dayfocus_v1'];
var CAL_MIG_MSG = 'جارٍ تحويل التقويم لهذه الإدارة إلى الميلادي. أعد المحاولة بعد دقائق.';
function calMigIs(resource) { return CAL_MIG_RES.indexOf(resource) >= 0; }
function calMigError(code, path, status) { var e = rsError(code, status || 409); if (path) e.path = String(path).slice(0, 200); e.msg = code === 'calendar-pending' ? CAL_MIG_MSG : ''; return e; }
function calMigPendingOf(row) { var v = parseJson(row && row.c, []); return Array.isArray(v) ? v.filter(function (d) { return typeof d === 'string'; }) : []; }
function calMigRep() { return { days: 0, months: 0, conflicts: [], recurring: [], plan: [], locks: [], extra: [], custodyDay0: 0, retro: 0 }; }
function calMigClone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
function calMigH(k) { var p = calGParse(k); return !!p && p.cal === 'h'; }
function calMigDay(k, path) { var g = calHtoGDay(k); if (!g) throw calMigError('calendar-unmapped', path || k); return g; }
function calMigStrDay(v, path) { var p = typeof v === 'string' ? calGParse(v) : null; return p && p.cal === 'h' && p.kind === 'day' ? calMigDay(v, path) : v; }
function calMigFixed(resource) { var r = opRegistry()[resource], s = r && r.prepared.resources[resource].spec; return (s && s.fields) || {}; }
/* قيمةُ اليوم: ما فيها من مفاتيح أيامٍ هجرية (imp.day · from في الجولات · cont في التقرير · rec/idem في المهام ق6) */
function calMigDayValue(resource, v, ctx, path) {
  if (v === null || typeof v !== 'object') return v;
  var x = calMigClone(v);
  if (resource === 'bassam_rounds_v1' || resource === 'bassam_rounds_arc_v1') {
    if (isObj(x.imp) && typeof x.imp.day === 'string') x.imp.day = calMigStrDay(x.imp.day, path + '/imp.day');
    if (typeof x.from === 'string') x.from = calMigStrDay(x.from, path + '/from');
  } else if (resource === 'bassam_dreport_v1') {
    if (typeof x.cont === 'string') x.cont = calMigStrDay(x.cont, path + '/cont');
    if (isObj(x.shifts)) Object.keys(x.shifts).forEach(function (s) { var o = x.shifts[s]; if (isObj(o) && typeof o.cont === 'string') o.cont = calMigStrDay(o.cont, path + '/' + s + '/cont'); });
  } else if (resource === 'bassam_tasks_v1' && Array.isArray(x)) {
    x.forEach(function (row, i) {
      var m = Array.isArray(row) ? row[23] : null; if (!isObj(m)) return;
      if (typeof m.idem === 'string') m.idem = m.idem.replace(/^(r:[^:]*:)([^:]+)(:.*)?$/, function (all, a, d, b) { return a + calMigStrDay(d, path + '[' + i + '].idem') + (b || ''); });
      var r = m.rec; if (!isObj(r)) return;
      if (typeof r.from === 'string') r.from = calMigStrDay(r.from, path + '[' + i + '].rec.from');
      if (typeof r.to === 'string') r.to = calMigStrDay(r.to, path + '[' + i + '].rec.to');
      if (r.t === 'monthly' && r.md !== 'last' && r.md != null && !r.calMd) {
        var md = calHtoGMd(r.md, ctx.T); if (md == null) throw calMigError('calendar-unmapped', path + '[' + i + '].rec.md');
        if (ctx.rep && !ctx.rep.recurring.some(function (q) { return q.id === r.id; })) ctx.rep.recurring.push({ id: r.id, from: r.md, to: md });
        r.md = md;
      }
    });
  }
  return x;
}
/* علاماتُ الأشهر m: (ق3، §3.3): الأشهرُ الميلادية التي تمسّها العلاماتُ الهجرية ⇐ سجلٌّ يحفظ قفلَ كلِّ يوم (calMonthRule) — أو لا شيء إن طابق الافتراض */
function calMigMarks(src, ctx, label) {
  var months = {}, out = {};
  Object.keys(src).forEach(function (h) { var p = h.split('-'); calGMonthsOfH(+p[0], +p[1]).forEach(function (x) { months[x.g] = 1; }); });
  Object.keys(months).sort().forEach(function (gm) {
    var r = calMonthRule(gm, src, ctx.T);
    if (!r.ok) throw calMigError('calendar-rule', label + '/m:' + gm);
    if (Object.keys(r.extra || {}).length && ctx.rep) ctx.rep.extra.push({ at: label + '/m:' + gm, extra: r.extra });
    if (r.rec) ocSet(out, 'm:' + gm, r.rec);
    if (ctx.rep) ctx.rep.months++;
  });
  return out;
}
/* خريطةُ أيامٍ (الجولات وأرشيفها · التقرير · المهام · dayshift): الحقولُ الثابتة أولاً بترتيبها · العلاماتُ مرتّبة · الأيامُ بترتيب الأصل */
function calMigDayMap(resource, doc, ctx) {
  if (!isObj(doc)) return doc;
  var fixed = calMigFixed(resource), out = {}, marks = {}, gm = {}, days = [], seen = {};
  Object.keys(doc).forEach(function (k) {
    if (ocOwn(fixed, k)) { ocSet(out, k, doc[k]); return; }
    var p = calGParse(k); if (!p || (p.kind !== 'day' && p.kind !== 'mctl')) throw calMigError('calendar-unmapped', resource + '/' + k);
    seen[p.cal] = 1;
    if (p.kind === 'mctl') { if (p.cal === 'h') marks[p.y + '-' + p.m] = doc[k]; else ocSet(gm, k, doc[k]); }
    else days.push(k);
  });
  if (seen.h && seen.g) throw calMigError('calendar-mixed', resource);
  var conv = seen.h ? calMigMarks(marks, ctx, resource) : gm;
  Object.keys(conv).forEach(function (k) { ocSet(out, k, conv[k]); });
  days.forEach(function (k) {
    var g = seen.h ? calMigDay(k, resource + '/' + k) : k;
    if (ocOwn(out, g)) throw calMigError('calendar-collision', resource + '/' + k);
    ocSet(out, g, seen.h ? calMigDayValue(resource, doc[k], ctx, resource + '/' + k) : doc[k]);
    if (seen.h && ctx.rep) ctx.rep.days++;
  });
  return out;
}
/* سجلاتُ أشهرٍ بلا أيام (أقفالُ الجدول · أقفالُ المهام): الشهرُ ⇐ calMonthLockRule · قفلُ اليوم 'y-m-d' ينتقل يوماً بيوم */
function calMigLocks(resource, doc, ctx) {
  if (!isObj(doc)) return doc;
  var src = {}, out = {}, seen = {}, months = {}, days = [];
  Object.keys(doc).forEach(function (k) {
    var p = calGParse(k); if (!p || p.kind === 'mctl') throw calMigError('calendar-unmapped', resource + '/' + k);
    seen[p.cal] = 1;
    if (p.kind === 'month') { if (p.cal === 'h') { src[p.y + '-' + p.m] = doc[k]; calGMonthsOfH(p.y, p.m).forEach(function (x) { months[x.g] = 1; }); } else ocSet(out, k, doc[k]); }
    else days.push(k);
  });
  if (seen.h && seen.g) throw calMigError('calendar-mixed', resource);
  Object.keys(months).sort().forEach(function (gm) {
    var v = calMonthLockRule(gm, src), L = calHMonthsOfG(gm).map(function (x) { return src[x.h]; });
    if (ctx.rep && L.some(function (x) { return JSON.stringify(x) !== JSON.stringify(L[0]); })) ctx.rep.locks.push({ res: resource, g: gm, from: calHMonthsOfG(gm).map(function (x) { return x.h; }), v: v === undefined ? null : v });
    if (v !== undefined) ocSet(out, gm, v);
    if (ctx.rep) ctx.rep.months++;
  });
  days.forEach(function (k) { ocSet(out, seen.h ? calMigDay(k, resource + '/' + k) : k, doc[k]); });
  return out;
}
/* إجازةٌ {fd,fm,fy,td,tm,ty,kind} بتاريخين هجريين مفكّكين ⇐ ميلادية (السنةُ الغائبة سنةُ شهرها، والمدى الذي يعبر السنة يأخذ السنةَ التالية) */
function calMigLeave(lv, hy, path) {
  if (!isObj(lv)) return null;
  var fy = lv.fy != null && lv.fy !== '' ? +lv.fy : hy, ty = lv.ty != null && lv.ty !== '' ? +lv.ty : (+lv.tm < +lv.fm ? fy + 1 : fy);
  if (calYearCal(fy) === 'g') return { lv: lv, a: calGKey(fy, +lv.fm, +lv.fd), b: calGKey(ty, +lv.tm, +lv.td) };
  var a = calHDay(fy, +lv.fm, +lv.fd), b = calHDay(ty, +lv.tm, +lv.td); if (!a || !b) throw calMigError('calendar-unmapped', path);
  var A = calGParse(a), B = calGParse(b), o = {};
  Object.keys(lv).forEach(function (k) { o[k] = lv[k]; });
  o.fd = A.d; o.fm = A.m; o.fy = A.y; o.td = B.d; o.tm = B.m; o.ty = B.y;
  return { lv: o, a: a, b: b };
}
var CAL_MIG_Q4 = ['shift', 'muk', 'cs'];
/* ق4: شهرٌ ميلادي من الجدول ⇐ وردياتُ الشهر الهجري الأكثر أياماً فيه (calMajority) · الإجازاتُ والأذونات بالأيام بدقة من كل مصدر · والتعارضُ يُذكر */
function calMigStaffMonth(gm, srcs, ctx, path) {
  var L = calHMonthsOfG(gm).filter(function (x) { return ocOwn(srcs, x.h) && isObj(srcs[x.h]); }); if (!L.length) return undefined;
  var maj = calMajority(gm), order = L.slice().sort(function (a, b) { return b.days - a.days || (a.h === maj.h ? -1 : b.h === maj.h ? 1 : 0); }), out = {}, q4 = [], G = calGParse(gm);
  var shiftsFrom = order.filter(function (x) { return ocOwn(srcs[x.h], '__shifts'); })[0];
  var emps = [];
  order.forEach(function (x) { Object.keys(srcs[x.h]).forEach(function (e) { if (e.indexOf('__') !== 0 && emps.indexOf(e) < 0) emps.push(e); }); });
  if (shiftsFrom) {
    ocSet(out, '__shifts', calMigClone(srcs[shiftsFrom.h].__shifts));
    order.forEach(function (x) { if (x !== shiftsFrom && ocOwn(srcs[x.h], '__shifts') && JSON.stringify(srcs[x.h].__shifts) !== JSON.stringify(srcs[shiftsFrom.h].__shifts)) q4.push({ e: '__shifts', f: '__shifts', a: srcs[shiftsFrom.h].__shifts, b: srcs[x.h].__shifts, ha: shiftsFrom.h, hb: x.h, pick: 'a', tie: maj.tie ? 1 : 0 }); });
  }
  emps.forEach(function (e) {
    var have = order.filter(function (x) { return isObj(srcs[x.h][e]); }), pick = have[0];
    if (!pick) { ocSet(out, e, calMigClone(srcs[order.filter(function (x) { return ocOwn(srcs[x.h], e); })[0].h][e])); return; }
    var rec = calMigClone(srcs[pick.h][e]), perms = [], permNum = true, permAny = false, leaves = [], seen = {};
    have.forEach(function (x) {
      var r = srcs[x.h][e];
      if (x !== pick) CAL_MIG_Q4.forEach(function (f) { if (JSON.stringify(r[f]) !== JSON.stringify(rec[f])) q4.push({ e: e, f: f, a: rec[f] === undefined ? null : rec[f], b: r[f] === undefined ? null : r[f], ha: pick.h, hb: x.h, pick: 'a', tie: maj.tie ? 1 : 0 }); });
      if (Array.isArray(r.perm)) { permAny = true; r.perm.forEach(function (d) { if (typeof d !== 'number') permNum = false; var g = calHDay(x.y, x.m, +d); if (!g) throw calMigError('calendar-unmapped', path + '/' + e + '/perm/' + d); var P = calGParse(g); if (P.y === G.y && P.m === G.m && perms.indexOf(P.d) < 0) perms.push(P.d); }); }
      if (Array.isArray(r.leaves)) r.leaves.forEach(function (lv, i) {
        var c = calMigLeave(lv, x.y, path + '/' + e + '/leaves/' + i); if (!c) return;
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
  if (q4.length && ocOwn(calMigBucketFixed(), '__calq4')) ocSet(out, '__calq4', q4);
  return out;
}
function calMigBucketFixed() { var s = opRegistry().bassam_staffing_v3.prepared.resources.bassam_staffing_v3.spec; return (s.entry && s.entry.fields) || {}; }
/* أشهرُ الجدول (v3: كلُّ مفتاحٍ شهر · v2: مفاتيحُ الأشهر بنمطها، وغيرُها صفوفُ موظفين تبقى) */
function calMigStaffing(resource, doc, ctx) {
  if (!isObj(doc)) return doc;
  var src = {}, keep = {}, months = {}, seen = {}, out = {};
  Object.keys(doc).forEach(function (k) {
    var p = calGParse(k);
    if (!p || p.kind !== 'month') { if (resource === 'bassam_staffing_v2') { ocSet(keep, k, doc[k]); return; } throw calMigError('calendar-unmapped', resource + '/' + k); }
    seen[p.cal] = 1;
    if (p.cal === 'g') { ocSet(keep, k, doc[k]); return; }
    src[p.y + '-' + p.m] = doc[k]; calGMonthsOfH(p.y, p.m).forEach(function (x) { months[x.g] = 1; });
  });
  if (seen.h && seen.g) throw calMigError('calendar-mixed', resource);
  Object.keys(keep).forEach(function (k) { if (!calGParse(k)) ocSet(out, k, keep[k]); });
  Object.keys(months).sort().forEach(function (gm) { var b = calMigStaffMonth(gm, src, ctx, resource + '/' + gm); if (b !== undefined) { ocSet(out, gm, b); if (ctx.rep) ctx.rep.months++; } });
  Object.keys(keep).forEach(function (k) { if (calGParse(k)) ocSet(out, k, keep[k]); });
  return out;
}
/* ق5: months.{ym} ⇐ خطةُ الشهر الهجري الأكثر أياماً (قد تتكرر في شهرين) · delMonths.{ym} للشهر الميلادي إن حُذفت مصادرُه كلُّها */
function calMigPlanMonth(gm, src, ctx) {
  var L = calHMonthsOfG(gm).filter(function (x) { return ocOwn(src, x.h); }); if (!L.length) return undefined;
  var maj = calMajority(gm), best = L.slice().sort(function (a, b) { return b.days - a.days || (a.h === maj.h ? -1 : b.h === maj.h ? 1 : 0); })[0];
  if (ctx.rep && (L.length > 1 || maj.tie)) ctx.rep.plan.push({ g: gm, from: best.h, also: L.filter(function (x) { return x !== best; }).map(function (x) { return x.h; }), tie: maj.tie ? 1 : 0 });
  return calMigClone(src[best.h]);
}
function calMigPlanMap(map, ctx, all, label) {
  if (!isObj(map)) return map;
  var src = {}, months = {}, seen = {}, out = {};
  Object.keys(map).forEach(function (k) { var p = calGParse(k); if (!p || p.kind !== 'month') throw calMigError('calendar-unmapped', label + '/' + k); seen[p.cal] = 1; if (p.cal === 'g') ocSet(out, k, map[k]); else { src[p.y + '-' + p.m] = map[k]; calGMonthsOfH(p.y, p.m).forEach(function (x) { months[x.g] = 1; }); } });
  if (seen.h && seen.g) throw calMigError('calendar-mixed', label);
  Object.keys(months).sort().forEach(function (gm) {
    if (all) { var L = calHMonthsOfG(gm); if (L.every(function (x) { return ocOwn(src, x.h); })) ocSet(out, gm, calMigClone(src[calMajority(gm).h])); return; }
    var v = calMigPlanMonth(gm, src, ctx); if (v !== undefined) { ocSet(out, gm, v); if (ctx.rep) ctx.rep.months++; }
  });
  return out;
}
function calMigPlan(doc, ctx) {
  if (!isObj(doc)) return doc;
  var out = {};
  Object.keys(doc).forEach(function (k) { ocSet(out, k, k === 'months' ? calMigPlanMap(doc.months, ctx, false, 'plan/months') : k === 'delMonths' ? calMigPlanMap(doc.delMonths, ctx, true, 'plan/delMonths') : doc[k]); });
  return out;
}
/* الدالةُ الواحدة للمورد كلِّه (الاستيراد · المرحلة ٢ للموارد الصغيرة) */
function calMigDoc(resource, doc, ctx) {
  if (doc === undefined || doc === null || !calMigIs(resource)) return doc;
  if (resource === 'bassam_rounds_v1' || resource === 'bassam_rounds_arc_v1' || resource === 'bassam_dreport_v1' || resource === 'bassam_tasks_v1') return calMigDayMap(resource, doc, ctx);
  if (resource === 'bassam_dayshift_v1') { if (!isObj(doc)) return doc; var o = {}, h = Object.keys(doc).some(calMigH); Object.keys(doc).forEach(function (k) { ocSet(o, h ? calMigDay(k, resource + '/' + k) : k, doc[k]); }); return o; }
  if (resource === 'bassam_tasks_locks_v1' || resource === 'bassam_staffing_locks_v1') return calMigLocks(resource, doc, ctx);
  if (resource === 'bassam_staffing_v3' || resource === 'bassam_staffing_v2') return calMigStaffing(resource, doc, ctx);
  if (resource === 'bassam_plan_v1') return calMigPlan(doc, ctx);
  if (resource === 'bassam_dayfocus_v1') { if (!isObj(doc) || calYearCal(+doc.y) !== 'h') return doc; var s = calHtoGScope({ y: doc.y, m: doc.m, d: doc.d }); if (!s) throw calMigError('calendar-unmapped', resource); var f = calMigClone(doc); f.y = s[0].y; f.m = s[0].m; f.d = s[0].d; return f; }
  return doc;
}
/* نصُّ وثيقةٍ (الاستيراد): يعيد النصَّ نفسَه إن لم يتغيّر شيء */
function calMigText(resource, text, ctx) {
  if (typeof text !== 'string' || !calMigIs(resource)) return text;
  var v = parseJson(text, undefined); if (v === undefined || v === null) return text;
  var out = calMigDoc(resource, v, ctx), t = JSON.stringify(out);
  return t === JSON.stringify(v) ? text : t;
}
/* مفاتيحُ «مرّةً واحدة» (dedup): كلُّ رمزِ يومٍ هجريٍّ ⇐ يومُه الميلادي · رمزُ شهرٍ ⇐ كلُّ شهرٍ ميلاديٍّ يمسّه (فلا يتكرر تنبيهٌ يومَ الترحيل — الخطر ٣) */
function calMigOnce(k) {
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
/* V7 · 53 تقويم (قرارُ الاقتران مع cal-rest، cal_api.md): خطواتُ 0004/0006/0008/0009 تكتب بخرائط أعمدةٍ صارت greg_* والجداولُ بعدُ hijri_* — تُشغَّل
   على قاعدةٍ تعيد كتابة الأسماء إلى hijri_* ما دام 0014 لم يُطبَّق، فيحوّلها 0014 بالمطابقة نفسِها كأيِّ صفٍّ آخر. */
function calLegacyEnv(env) {
  /* المعرّفاتُ وحدها: مساراتُ json_extract ('$.greg_year') تقرأ مفاتيحَ الصفوف المربوطة كما هي (greg_*) فلا تُمسّ — وإلا عادت القيمُ NULL */
  var DB = env.DB, rx = /(?<!\$\.)\bgreg_(year|month|day|date)\b/g, out = Object.assign({}, env);
  out.DB = { prepare: function (s) { return DB.prepare(String(s).replace(rx, 'hijri_$1')); }, batch: function (a) { return DB.batch(a); }, exec: function (s) { return DB.exec(String(s).replace(rx, 'hijri_$1')); } };
  return out;
}
/* الرصد (KV الإدارة): reports[].{y,m,d} ⇐ ميلادية · نوافذُه windows[].scope: يوم ⇐ يومه · شهرٌ ساري ⇐ يُكرَّر في الشهرين (ق7) · غيرُه ⇐ شهرُ يومه الأول */
function calMigRasd(v, now, k) {
  var changed = false; if (!isObj(v)) return false;
  if (Array.isArray(v.reports)) v.reports.forEach(function (r, j) { if (!isObj(r) || calYearCal(+r.y) !== 'h') return; var s = calHtoGScope({ y: +r.y, m: +r.m, d: r.d == null || r.d === '' ? null : +r.d }); if (!s) throw calMigError('calendar-unmapped', k + ' reports[' + j + ']'); r.y = s[0].y; r.m = s[0].m; if (r.d != null && r.d !== '') r.d = s[0].d; changed = true; });
  if (Array.isArray(v.windows)) {
    var add = [];
    v.windows.forEach(function (w, j) {
      if (!isObj(w) || !isObj(w.scope) || calYearCal(+w.scope.y) !== 'h') return;
      var s = calHtoGScope(w.scope); if (!s) throw calMigError('calendar-unmapped', k + ' windows[' + j + ']');
      if (!w.closedAt && +w.until > now) s.slice(1).forEach(function (x, n) { var c = calMigClone(w); c.id = String(w.id) + '~g' + (n + 2); c.scope = Object.assign({}, w.scope, { y: x.y, m: x.m, d: x.d }); add.push(c); });
      w.scope = Object.assign({}, w.scope, { y: s[0].y, m: s[0].m, d: s[0].d }); changed = true;
    });
    v.windows = v.windows.concat(add);
  }
  return changed;
}
/* صفٌّ علائقيٌّ من نسخة (الاسترشاد · المضبوطات · العهد · الجائزة): (y,m,d) و«التاريخ» نصاً ⇐ ميلادية بأسماء أعمدته كما هي (hijri_* قبل cal-rest أو greg_* بعده) */
function calMigRow(row, rep, at) {
  if (!isObj(row)) return;
  ['greg_', 'hijri_'].forEach(function (p) {
    var y = row[p + 'year'];
    if (y != null && calYearCal(+y) === 'h') {
      var d = row[p + 'day'], s = calHtoGScope({ y: +y, m: +row[p + 'month'], d: d == null ? null : +d }); if (!s) throw calMigError('calendar-unmapped', at);
      row[p + 'year'] = s[0].y; row[p + 'month'] = s[0].m; if (d != null) row[p + 'day'] = s[0].d;
      if (d != null && +d === 0 && rep) rep.custodyDay0++;
    }
    var t = row[p + 'date'];
    if (typeof t === 'string' && calMigH(t)) { var g = calHtoGDay(t); if (!g) throw calMigError('calendar-unmapped', at); row[p + 'date'] = g; }
  });
}
/* الإحصائياتُ في النسخ (dailyStats.data = { haram|nabawi: {'YYYY-MM-DD': يوم}, locks: {'site|y-m': true|{ap,mo,dopen,dshut}} }) */
function calMigDstats(data, ctx) {
  if (!isObj(data)) return data;
  var out = {}, src = {};
  Object.keys(data).forEach(function (s) {
    if (s === 'locks') return;
    var m = data[s]; if (!isObj(m)) { out[s] = m; return; }
    var o = {}; Object.keys(m).forEach(function (k) { ocSet(o, calMigH(k) ? calMigDay(k, 'dailyStats/' + s + '/' + k) : k, m[k]); if (calMigH(k) && ctx.rep) ctx.rep.days++; }); out[s] = o;
  });
  if (isObj(data.locks)) {
    var L = {}, months = {};
    Object.keys(data.locks).forEach(function (k) {
      var q = /^(\w+)\|(\d{4})-(\d{1,2})$/.exec(k); if (!q) throw calMigError('calendar-unmapped', 'dailyStats/locks/' + k);
      if (calYearCal(+q[2]) !== 'h') { L[k] = data.locks[k]; return; }
      (src[q[1]] = src[q[1]] || {})[(+q[2]) + '-' + (+q[3])] = data.locks[k]; calGMonthsOfH(+q[2], +q[3]).forEach(function (x) { months[q[1] + '|' + x.g] = 1; });
    });
    Object.keys(months).sort().forEach(function (sk) {
      var site = sk.split('|')[0], gm = sk.split('|')[1], r = calMonthRule(gm, src[site], ctx.T); if (!r.ok) throw calMigError('calendar-rule', 'dailyStats/locks/' + sk);
      if (!r.rec) return;
      var all = calHMonthsOfG(gm).every(function (x) { return src[site][x.h] === true; });
      L[sk] = all && r.rec.ap && Object.keys(r.rec).length <= 2 ? true : r.rec;
    });
    out.locks = L;
  }
  return out;
}
/* نسخةٌ (استيرادٌ أو استعادة — 019f rsConvertBackup): كلُّ موردٍ تقويميٍّ في keys وكلُّ صفٍّ علائقيٍّ في domains ⇐ ميلادي بالقاعدة نفسِها (ق12) */
function calMigBackup(keys, domains, summary, T, rep0) {
  var rep = rep0 || calMigRep(), ctx = { T: T, rep: rep }, now = Date.now();
  Object.keys(keys || {}).forEach(function (k) {
    var r = resName(k);
    if (calMigIs(r)) keys[k] = calMigText(r, keys[k], ctx);
    else if ((r === 'bassam_rasd_v1' || r === 'bassam_rasd_retro_v1') && typeof keys[k] === 'string') { var v = parseJson(keys[k], null); if (calMigRasd(v, now, k)) keys[k] = JSON.stringify(v); }
  });
  ['irshad', 'custody', 'seized', 'awards'].forEach(function (n) {
    (Array.isArray(domains && domains[n]) ? domains[n] : []).forEach(function (dom) {
      if (!dom || !isObj(dom.rows)) return;
      Object.keys(dom.rows).forEach(function (t) { (Array.isArray(dom.rows[t]) ? dom.rows[t] : []).forEach(function (row, i) { calMigRow(row, rep, n + '/' + t + '[' + i + ']'); }); });
    });
  });
  if (domains && domains.dailyStats && isObj(domains.dailyStats.data)) domains.dailyStats.data = calMigDstats(domains.dailyStats.data, ctx);
  if (summary) summary.calendar = calMigSummaryText(rep);
  return rep;
}
/* صفوفُ مجالاتٍ علائقية في نسخةٍ حديثة صُدِّرت قبل 0014: أسماءُ أعمدتها hijri_* ⇐ greg_* (ق2) وقيمُها ⇐ ميلادية — قبل التحقّق من شكلها */
function calMigDomains(domains, rep) {
  ['irshad', 'custody', 'seized', 'awards'].forEach(function (n) {
    (Array.isArray(domains && domains[n]) ? domains[n] : []).forEach(function (dom) {
      if (!dom || !isObj(dom.rows)) return;
      Object.keys(dom.rows).forEach(function (t) {
        (Array.isArray(dom.rows[t]) ? dom.rows[t] : []).forEach(function (row, i) {
          if (!isObj(row)) return;
          calMigRow(row, rep, n + '/' + t + '[' + i + ']');
          Object.keys(row).forEach(function (c) { var m = /^hijri_(year|month|day|date)$/.exec(c); if (m && !ocOwn(row, 'greg_' + m[1])) { row['greg_' + m[1]] = row[c]; delete row[c]; } });
        });
      });
    });
  });
  if (domains && domains.dailyStats && isObj(domains.dailyStats.data)) domains.dailyStats.data = calMigDstats(domains.dailyStats.data, { T: calToday(Date.now()).k, rep: rep });
  return rep;
}
/* وثائقُ KV القديمة للمجالات العلائقية (بشكل Production — قبل جداولها): كلُّ {y,m,d} بسنةٍ هجرية ⇐ ميلادي (الشهرُ بلا يوم ⇐ شهرُ يومه الأول · يومُ 0 يبقى، ق10)
   وكلُّ نصٍّ هو مفتاحُ يومٍ هجري ⇐ يومُه الميلادي. الإحصائياتُ بقاعدة أقفالها (ق3). تُحوَّل قبل bc.convert.* فيتحقّق المحوِّلُ من قيمٍ ميلادية */
var CAL_MIG_KV = ['bassam_custody_v1', 'bassam_irshad_v1', 'bassam_irshad_retro_v1', 'bassam_seized_v1', 'bassam_seized_retro_v1', 'bassam_award_v1'];
function calMigWalk(v, rep, path) {
  if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) { if (typeof v[i] === 'string' && calMigH(v[i]) && calGParse(v[i]).kind === 'day') v[i] = calMigDay(v[i], path + '[' + i + ']'); else calMigWalk(v[i], rep, path + '[' + i + ']'); } return; }
  if (!isObj(v)) return;
  if (v.y != null && v.m != null && calYearCal(+v.y) === 'h' && +v.m >= 1 && +v.m <= 12) {
    var d = v.d == null || v.d === '' ? null : +v.d, s = calHtoGScope({ y: +v.y, m: +v.m, d: d }); if (!s) throw calMigError('calendar-unmapped', path);
    v.y = typeof v.y === 'string' ? String(s[0].y) : s[0].y; v.m = typeof v.m === 'string' ? String(s[0].m) : s[0].m; if (d != null) v.d = typeof v.d === 'string' ? String(s[0].d) : s[0].d;
    if (rep) { rep.days++; if (d === 0) rep.custodyDay0++; }
  }
  Object.keys(v).forEach(function (k) { var x = v[k]; if (typeof x === 'string' && calMigH(x) && calGParse(x).kind === 'day') v[k] = calMigDay(x, path + '.' + k); else if (x && typeof x === 'object') calMigWalk(x, rep, path + '.' + k); });
}
function calMigLegacyKV(keys, T, rep) {
  Object.keys(keys || {}).forEach(function (k) {
    var r = resName(k), raw = keys[k]; if (typeof raw !== 'string') return;
    if (r === 'bassam_dstats_v1') { var ds = parseJson(raw, null); if (isObj(ds)) { var o = calMigDstats(ds, { T: T, rep: rep }); if (JSON.stringify(o) !== raw) keys[k] = JSON.stringify(o); } return; }
    if (CAL_MIG_KV.indexOf(r) < 0) return;
    var v = parseJson(raw, null); if (v === null || typeof v !== 'object') return;
    var before = JSON.stringify(v); calMigWalk(v, rep, k); var after = JSON.stringify(v); if (after !== before) keys[k] = after;
  });
  return rep;
}
/* سطرُ الملخّص قبل التأكيد (التصميم §4): «حُوِّل إلى الميلادي: n يوماً · m شهراً · k تعارضاً» — الأرقامُ والأسماءُ للواجهة (548) */
function calMigSummaryText(rep) {
  return { days: rep.days, months: rep.months, conflicts: rep.conflicts.reduce(function (n, c) { return n + c.n; }, 0), conflictMonths: rep.conflicts.map(function (c) { return c.g; }),
    recurring: rep.recurring.slice(0, 50), plan: rep.plan.map(function (x) { return x.g; }), custodyDay0: rep.custodyDay0 };
}
function calMigMergeRep(a, b) { if (!b) return a; a.days += b.days || 0; a.months += b.months || 0; a.custodyDay0 += b.custodyDay0 || 0; ['conflicts', 'recurring', 'plan', 'locks', 'extra'].forEach(function (f) { (b[f] || []).forEach(function (x) { a[f].push(x); }); }); return a; }
/* ── المرحلة ١: خطةُ بيانات 0014 (تُقرأ قبل الدفعة · كلُّ كتابتها في الدفعة الذرّية نفسِها خلف حارس الترحيل) ── */
var CAL_MIG_TABLES = [['daily_stats_days', null], ['custody_movements', 'hijri_year,hijri_month,hijri_day'], ['irshad_reports', 'hijri_year,hijri_month,hijri_day'], ['seized_reports', 'hijri_year,hijri_month,hijri_day'],
  ['irshad_retro_windows', 'hijri_year,hijri_month,hijri_day'], ['seized_retro_windows', 'hijri_year,hijri_month,hijri_day'], ['daily_stats_month_locks', 'hijri_year,hijri_month,1']];
function calMigChunks(rows) { return rsChunks(rows); }
async function calMigPrepare(env) {
  var D = env.DB, now = Date.now(), T = calToday(now).k, before = [], after = [], need = {}, i;
  before.push(D.prepare('CREATE TABLE IF NOT EXISTS cal_hg_days (hy INTEGER NOT NULL, hm INTEGER NOT NULL, hd INTEGER NOT NULL, gy INTEGER NOT NULL, gm INTEGER NOT NULL, gd INTEGER NOT NULL, PRIMARY KEY (hy, hm, hd)) WITHOUT ROWID'));
  /* ① الأيامُ الهجرية الموجودة في الجداول ⇐ المطابقة (السنواتُ كاملةً بين أدناها وأعلاها) — صفٌّ بلا تحويل يوقف الترحيلَ باسمه قبل أي كتابة */
  for (i = 0; i < CAL_MIG_TABLES.length; i++) {
    var t = CAL_MIG_TABLES[i], sel = t[1] ? 'SELECT DISTINCT ' + t[1].split(',').map(function (c, j) { return c + ' AS ' + 'ymd'.charAt(j); }).join(',') + ' FROM ' + t[0] + ' WHERE hijri_year IS NOT NULL' :
      "SELECT DISTINCT CAST(substr(hijri_date,1,4) AS INTEGER) y,CAST(substr(hijri_date,6,2) AS INTEGER) m,CAST(substr(hijri_date,9,2) AS INTEGER) d FROM " + t[0] + " WHERE hijri_date GLOB '1[3-6][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'";
    (((await D.prepare(sel).all()).results) || []).forEach(function (r) {
      var y = +r.y, m = +r.m, d = r.d == null || +r.d === 0 ? 1 : +r.d;
      if (!calHDay(y, m, d)) throw new Error('db-cal-unmapped: ' + t[0] + ' ' + r.y + '-' + r.m + '-' + r.d);
      need[y] = 1;
    });
  }
  var rows = [];
  Object.keys(need).map(Number).sort(function (a, b) { return a - b; }).forEach(function (y) {
    for (var m = 1; m <= 12; m++) for (var d = 1; d <= 30; d++) { var g = calHDay(y, m, d); if (g) { var p = calGParse(g); rows.push([y, m, d, p.y, p.m, p.d]); } }
  });
  calMigChunks(rows).forEach(function (part) { before.push(D.prepare("INSERT INTO cal_hg_days(hy,hm,hd,gy,gm,gd) SELECT json_extract(j.value,'$[0]'),json_extract(j.value,'$[1]'),json_extract(j.value,'$[2]'),json_extract(j.value,'$[3]'),json_extract(j.value,'$[4]'),json_extract(j.value,'$[5]') FROM json_each(?1) j WHERE 1 ON CONFLICT DO NOTHING").bind(JSON.stringify(part))); });
  /* ①ب تاريخُ الجائزة نصٌّ (YYYY-MM-DD أو y-m-d كما كتبه العميل) ⇐ ميلاديٌّ مبطَّن */
  var aw = [];
  (((await D.prepare('SELECT department_id d,record_id r,hijri_date x FROM award_records WHERE hijri_date IS NOT NULL').all()).results) || []).forEach(function (r) {
    if (!calMigH(r.x)) return; var g = calHtoGDay(String(r.x)); if (!g) throw new Error('db-cal-unmapped: award_records ' + r.r + ' ' + r.x); aw.push([r.d, r.r, g]);
  });
  calMigChunks(aw).forEach(function (part) { after.push(D.prepare("UPDATE award_records SET greg_date=json_extract(j.value,'$[2]') FROM json_each(?1) j WHERE award_records.department_id=json_extract(j.value,'$[0]') AND award_records.record_id=json_extract(j.value,'$[1]')").bind(JSON.stringify(part))); });
  /* ② أقفالُ الإحصائيات (ق3 «السلوكُ اليومي المطابق»): لكل موقعٍ سجلُّ الشهر الهجري {ap · mo · dopen · dshut} ⇐ سجلاتُ الأشهر الميلادية */
  var ml = ((await D.prepare('SELECT site,hijri_year y,hijri_month m,approved a,reopened r,legacy_boolean l FROM daily_stats_month_locks').all()).results) || [],
    dl = ((await D.prepare('SELECT site,hijri_year y,hijri_month m,hijri_day d,is_open o,is_shut s FROM daily_stats_day_locks').all()).results) || [];
  if (ml.length) {
    var bySite = {}, legacy = {}, mrows = [], drows = [];
    ml.forEach(function (r) { var o = (bySite[r.site] = bySite[r.site] || {})[r.y + '-' + r.m] = {}; if (r.a) o.ap = 1; if (r.r) o.mo = 1; legacy[r.site + '|' + r.y + '-' + r.m] = !!r.l; });
    dl.forEach(function (r) { var o = ((bySite[r.site] = bySite[r.site] || {})[r.y + '-' + r.m] = (bySite[r.site] || {})[r.y + '-' + r.m] || {}); if (r.o) (o.dopen = o.dopen || {})[r.d] = 1; if (r.s) (o.dshut = o.dshut || {})[r.d] = 1; });
    Object.keys(bySite).forEach(function (site) {
      var src = bySite[site], months = {};
      Object.keys(src).forEach(function (h) { var p = h.split('-'); calGMonthsOfH(+p[0], +p[1]).forEach(function (x) { months[x.g] = 1; }); });
      Object.keys(months).sort().forEach(function (gm) {
        var r = calMonthRule(gm, src, T), G = calGParse(gm); if (!r.ok) throw new Error('db-cal-rule: daily_stats ' + site + ' ' + gm);
        if (!r.rec) return;
        var L = calHMonthsOfG(gm), lg = !!r.rec.ap && L.every(function (x) { return legacy[site + '|' + x.h]; }), days = {};
        mrows.push([site, G.y, G.m, r.rec.ap ? 1 : 0, r.rec.mo ? 1 : 0, lg ? 1 : 0]);
        Object.keys(r.rec.dopen || {}).concat(Object.keys(r.rec.dshut || {})).forEach(function (d) { days[d] = 1; });
        Object.keys(days).forEach(function (d) { drows.push([site, G.y, G.m, +d, (r.rec.dopen || {})[d] ? 1 : 0, (r.rec.dshut || {})[d] ? 1 : 0]); });
      });
    });
    after.push(D.prepare('DELETE FROM daily_stats_day_locks'), D.prepare('DELETE FROM daily_stats_month_locks'));
    calMigChunks(mrows).forEach(function (part) { after.push(D.prepare("INSERT INTO daily_stats_month_locks(site,greg_year,greg_month,approved,reopened,legacy_boolean) SELECT json_extract(j.value,'$[0]'),json_extract(j.value,'$[1]'),json_extract(j.value,'$[2]'),json_extract(j.value,'$[3]'),json_extract(j.value,'$[4]'),json_extract(j.value,'$[5]') FROM json_each(?1) j").bind(JSON.stringify(part))); });
    calMigChunks(drows).forEach(function (part) { after.push(D.prepare("INSERT INTO daily_stats_day_locks(site,greg_year,greg_month,greg_day,is_open,is_shut) SELECT json_extract(j.value,'$[0]'),json_extract(j.value,'$[1]'),json_extract(j.value,'$[2]'),json_extract(j.value,'$[3]'),json_extract(j.value,'$[4]'),json_extract(j.value,'$[5]') FROM json_each(?1) j").bind(JSON.stringify(part))); });
  }
  /* ③ نوافذُ الاستدراك (ق7): نافذةُ يومٍ ⇐ يومُها · نافذةُ شهرٍ ساريةٌ ⇐ تُكرَّر في الشهرين الميلاديين بالمهلة نفسِها (معرّفٌ جديد «~g») ·
       المنتهيةُ والمغلقة ⇐ الشهرُ الميلادي لأول يومٍ من شهرها الهجري */
  for (var tw of ['irshad_retro_windows', 'seized_retro_windows']) {
    var cols = (((await D.prepare('PRAGMA table_info(' + tw + ')').all()).results) || []).map(function (c) { return c.name; }),
      ws = ((await D.prepare('SELECT department_id d,window_id w,sequence q,hijri_year y,hijri_month m,hijri_day dd,until_at u,closed_at c FROM ' + tw).all()).results) || [], upd = [], dup = [], maxq = {};
    ws.forEach(function (r) { maxq[r.d] = Math.max(maxq[r.d] || 0, +r.q || 0); });
    ws.forEach(function (r) {
      if (r.y == null || calYearCal(+r.y) !== 'h') return;
      var s = calHtoGScope({ y: +r.y, m: +r.m, d: r.dd == null ? null : +r.dd }); if (!s) throw new Error('db-cal-unmapped: ' + tw + ' ' + r.w);
      upd.push([r.d, r.w, s[0].y, s[0].m, s[0].d]);
      if (s.length > 1 && r.c == null && +r.u > now) s.slice(1).forEach(function (x, j) { dup.push([r.d, r.w, r.w + '~g' + (j + 2), (maxq[r.d] = maxq[r.d] + 1), x.y, x.m]); });
    });
    calMigChunks(upd).forEach(function (part) { after.push(D.prepare('UPDATE ' + tw + " SET greg_year=json_extract(j.value,'$[2]'),greg_month=json_extract(j.value,'$[3]'),greg_day=json_extract(j.value,'$[4]') FROM json_each(?1) j WHERE " + tw + ".department_id=json_extract(j.value,'$[0]') AND " + tw + ".window_id=json_extract(j.value,'$[1]')").bind(JSON.stringify(part))); });
    var gc = cols.map(function (c) { return c.replace(/^hijri_/, 'greg_'); }), pick = gc.map(function (c) { return c === 'window_id' ? '?3' : c === 'sequence' ? '?4' : c === 'greg_year' ? '?5' : c === 'greg_month' ? '?6' : c === 'greg_day' ? 'NULL' : c; });
    dup.forEach(function (x) { after.push(D.prepare('INSERT INTO ' + tw + '(' + gc.join(',') + ') SELECT ' + pick.join(',') + ' FROM ' + tw + ' WHERE department_id=?1 AND window_id=?2').bind(x[0], x[1], x[2], x[3], x[4], x[5])); });
  }
  /* ④ الرصد (KV): reports[].{y,m,d} · نوافذُه windows[].scope (ق7 كما فوق) */
  var kvs = kvJoin(((await D.prepare("SELECT k,seq,v FROM kv WHERE k GLOB '*bassam_rasd_v1' OR k GLOB '*bassam_rasd_retro_v1' ORDER BY k,seq").all()).results) || []);
  Object.keys(kvs).forEach(function (k) {
    var v = parseJson(kvs[k], null); if (!calMigRasd(v, now, k)) return;
    after.push.apply(after, kvPutStmts(env, 'kv', k, JSON.stringify(v)));
    after.push(D.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k));
  });
  /* ⑤ notification_dedup: مفاتيحُ آخر سبعة أيام تأخذ نسخةً ميلادية (الأصلُ يبقى وتُسقطه مدةُ الحفظ) — فلا يتكرر تنبيهٌ يومَ الترحيل */
  var dd = ((await D.prepare('SELECT scope,once_key,created_at,message_id FROM notification_dedup WHERE created_at>?1').bind(now - 7 * 864e5).all()).results) || [], drows2 = [];
  dd.forEach(function (r) { calMigOnce(String(r.once_key)).forEach(function (k2) { drows2.push([r.scope, k2, r.created_at, r.message_id]); }); });
  calMigChunks(drows2).forEach(function (part) { after.push(D.prepare("INSERT OR IGNORE INTO notification_dedup(scope,once_key,created_at,message_id) SELECT json_extract(j.value,'$[0]'),json_extract(j.value,'$[1]'),json_extract(j.value,'$[2]'),json_extract(j.value,'$[3]') FROM json_each(?1) j").bind(JSON.stringify(part))); });
  /* ⑥ب الإداراتُ المعلَّقة (كما في ملف 0014) — تُعاد هنا في آخر الدفعة: على قاعدةٍ أقدم من 10 تُكتب صفوفُ 0010 التشغيلية بعد عبارات 0014 */
  after.push(D.prepare("INSERT INTO meta (k, v) SELECT '" + CAL_MIG_PENDING + "', x FROM (SELECT json_group_array(d) x, COUNT(*) n FROM (SELECT DISTINCT department_id d FROM ops_nodes WHERE resource IN (SELECT value FROM json_each(?1)) ORDER BY d)) WHERE n > 0 ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(JSON.stringify(CAL_MIG_RES)));
  /* ⑥ اليومُ المرجعي T للمرحلة ٢ (ثابتٌ لكل إداراتها، فإعادتُها حتمية) */
  after.push(D.prepare("INSERT INTO meta(k,v) VALUES('" + CAL_MIG_TKEY + "',?1) ON CONFLICT(k) DO NOTHING").bind(T));
  return { before: before, after: after };
}
/* ── المرحلة ٢ ── */
/* قراءةُ الصفوف المخزَّنة بمخطّطٍ «موسَّع»: أنماطُ مفاتيح التاريخ في المخطّط الحالي قد ضُيّقت إلى ISO (cal-ops) — والصفوفُ الهجرية تُفكّ بنسخةٍ من التعريفات
   نفسِها (الجداولُ نفسُها) أنماطُ تاريخها تقبل الصيغتين. للقراءة وحدها؛ الكتابةُ بالمخطّط الحالي. */
var CAL_WIDE = null;
function calWidePattern(p) {
  var re; try { re = new RegExp(p); } catch (e) { return p; }
  if (re.test('zz') || re.test('')) return p;
  if (re.test('m:2026-11')) return '^m:\\d{4}-\\d{1,2}$';
  if (re.test('2026-11-24-r')) return '^\\d{4}-\\d{1,2}-\\d{1,2}(?:-.+)?$';
  if (re.test('2026-11-24') && re.test('2026-11')) return '^\\d{4}-\\d{1,2}(?:-\\d{1,2})?$';
  if (re.test('2026-11-24')) return '^\\d{4}-\\d{1,2}-\\d{1,2}$';
  if (re.test('2026-11')) return '^\\d{4}-\\d{1,2}$';
  return p;
}
function calWideRegistry() {
  if (CAL_WIDE) return CAL_WIDE;
  var memo = new Map();
  function clone(n) {
    if (!n || typeof n !== 'object') return n;
    if (memo.has(n)) return memo.get(n);
    var o = Array.isArray(n) ? [] : {}; memo.set(n, o);
    Object.keys(n).forEach(function (k) { o[k] = k === 'pattern' && typeof n[k] === 'string' ? calWidePattern(n[k]) : clone(n[k]); });
    return o;
  }
  var defs = opDefinitions().map(function (d) { return Object.assign({}, d, { schema: clone(d.schema) }); }), all = ocPrepare(defs, OC_TABLE_NAMES), out = Object.create(null);
  defs.forEach(function (d) { out[d.resource] = ocForResource(all, d.resource); });
  CAL_WIDE = out;
  return out;
}
/* صفوفُ مداياتٍ من row_key لموردٍ واحد ⇐ القيمةُ (partial: الرأسُ وما طُلب من الأعضاء) */
async function calMigRead(env, dept, resource, ranges, partial) {
  var prepared = calWideRegistry()[resource], tables = ocPhysicalTables(prepared), physical = {}, names = Object.keys(tables), st = [];
  names.forEach(function (t) {
    physical[t] = [];
    for (var c = 0; c < ranges.length; c += 24) st.push({ t: t, s: env.DB.prepare('SELECT ' + tables[t].map(function (c2) { return 'x.' + c2; }).join(',') + ' FROM json_each(?3) q CROSS JOIN ' + t + " x ON x.department_id=?1 AND x.resource=?2 AND x.row_key>=json_extract(q.value,'$[0]') AND x.row_key<json_extract(q.value,'$[1]')").bind(dept, resource, JSON.stringify(ranges.slice(c, c + 24))) });
  });
  for (var i = 0; i < st.length; i += 40) {
    var part = st.slice(i, i + 40), got = await env.DB.batch(part.map(function (x) { return x.s; }));
    part.forEach(function (x, j) { (got[j].results || []).forEach(function (r) { physical[x.t].push(r); }); });
  }
  var read = ocFromPhysicalRead(prepared, dept, resource, physical, partial ? { partial: 1 } : { trust: 1 });
  return read.projection.present ? read.projection.value : undefined;
}
function calMigMembers(env, dept, resource, parent) {
  return env.DB.prepare('SELECT member_key m,position p FROM ops_nodes WHERE department_id=?1 AND resource=?2 AND parent_key=?3 ORDER BY position,member_key').bind(dept, resource, parent).all().then(function (r) { return (r.results || []).filter(function (x) { return typeof x.m === 'string'; }); });
}
function calMigMemberRanges(container, names) { var out = []; names.forEach(function (p) { var r = container + '/e:' + encodeURIComponent(p); out.push([r, r + '\u0001'], [r + '/', r + '0']); }); return out; }
function calMigHeadRanges(container) { var e = container + '/e'; return [['', e + ':'], [e + ';', '\uffff']]; }
/* حذفُ مدى (فصلُ الآباء ثم الحذف: كياناتُ العقد تتبعها بقيدها) — موسومٌ بمفتاح المورد (dbGuardRevised) */
function calMigDrop(env, dept, resource, ranges) {
  var K = 'bsdept:' + dept + ':' + resource, out = [];
  ranges.forEach(function (r) {
    out.push(opTag(env.DB.prepare('UPDATE ops_nodes SET parent_key=NULL WHERE department_id=?1 AND resource=?2 AND row_key>=?3 AND row_key<?4').bind(dept, resource, r[0], r[1]), [K]));
    Object.keys(ocPhysicalTables(opPrepared(resource))).reverse().forEach(function (t) { out.push(opTag(env.DB.prepare('DELETE FROM ' + t + ' WHERE department_id=?1 AND resource=?2 AND row_key>=?3 AND row_key<?4').bind(dept, resource, r[0], r[1]), [K])); });
  });
  return out;
}
/* صفوفُ عضوٍ واحد بالمرمِّز الحالي: يُرمَّز داخل وثيقةٍ تحمله وحده ثم يُترك ما فوقه؛ موضعُه في حاويته pos */
function calMigMemberRows(env, dept, resource, container, wrap, name, pos) {
  var prepared = opPrepared(resource), dom = ocConvert(prepared, dept, resource, wrap, true), rows = ocPhysicalRows(prepared, dom), key = container + '/e:' + encodeURIComponent(name), K = 'bsdept:' + dept + ':' + resource, out = [];
  Object.keys(ocPhysicalTables(prepared)).forEach(function (t) {
    var list = (rows[t] || []).filter(function (r) { return r.row_key === key || r.row_key.indexOf(key + '/') === 0; });
    list.forEach(function (r) { if (r.row_key === key && t === 'ops_nodes') r.position = pos; });
    if (list.length) opUpsertRows(env, { table: t, columns: ocPhysicalTables(prepared)[t] }, list).forEach(function (s) { out.push(opTag(s, [K])); });
  });
  return out;
}
function calMigAllRows(env, dept, resource, doc) {
  var prepared = opPrepared(resource), rows = ocPhysicalRows(prepared, ocConvert(prepared, dept, resource, doc, true)), K = 'bsdept:' + dept + ':' + resource, out = [];
  Object.keys(ocPhysicalTables(prepared)).forEach(function (t) { opUpsertRows(env, { table: t, columns: ocPhysicalTables(prepared)[t] }, rows[t] || []).forEach(function (s) { out.push(opTag(s, [K])); }); });
  return { st: out, rows: rows };
}
function calMigRevs(env, keys) {
  return [env.DB.prepare("INSERT INTO meta(k,v) VALUES('rev',CAST(MAX(COALESCE((SELECT CAST(v AS INTEGER) FROM meta WHERE k='rev'),0),COALESCE((SELECT MAX(rev) FROM revs),0))+1 AS TEXT)) ON CONFLICT(k) DO UPDATE SET v=excluded.v"),
    env.DB.prepare("INSERT INTO revs(k,rev) SELECT j.value,CAST((SELECT v FROM meta WHERE k='rev') AS INTEGER) FROM json_each(?1) j WHERE 1 ON CONFLICT(k) DO UPDATE SET rev=excluded.rev").bind(JSON.stringify(keys))];
}
async function calMigRev(env, K) { var r = await env.DB.prepare('SELECT rev FROM revs WHERE k=?1').bind(K).first(); return rsNat((r && r.rev) || 0); }
function calMigHas(env, dept, resource) { return env.DB.prepare("SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource=?2 AND row_key='$'").bind(dept, resource).first('n').then(Number); }
/* دفعةٌ واحدة: حارسُ النسخة لكل مورد (لا كاتبَ آخر — الإدارةُ معلَّقة) · الكتابات · المراجعات · الملخّص. فوق الميزانية ⇐ يُصغَّر الجزءُ (المستدعي) */
async function calMigCommit(env, guards, st, keys, sum, dept) {
  var all = guards.concat(st, calMigRevs(env, keys), [env.DB.prepare('INSERT INTO meta(k,v) VALUES(?1,?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v').bind(CAL_MIG_SUM + dept, JSON.stringify(sum))]);
  opSaveBudget(all);
  await env.DB.batch(all);
}
function calMigSummary(sum, rep) {
  sum.days += rep.days; sum.months += rep.months;
  ['conflicts', 'recurring', 'plan', 'locks', 'extra'].forEach(function (f) { rep[f].forEach(function (x) { if (!sum[f].some(function (y) { return JSON.stringify(y) === JSON.stringify(x); })) sum[f].push(x); }); });
}
/* خرائطُ الأيام: الحيُّ + أرشيفُه (الجولات) أو موردٌ واحد. الأيامُ تُنقل أجزاءً (حذفُ الهجري وإدراجُ الميلادي في الدفعة نفسِها)، ثم العلاماتُ والرأسُ أخيراً.
   مواضعُ الحاوية: الحقولُ الثابتة ثم العلاماتُ ثم الأيام (كما يكتبها calMigDayMap للوثيقة كلِّها) — فالنتيجةُ حرفاً ما يكتبه الحفظُ الحي للوثيقة المحوَّلة. */
async function calMigDayMapPhase(env, dept, R, A, ctx, sum, budget) {
  var KR = 'bsdept:' + dept + ':' + R, KA = A ? 'bsdept:' + dept + ':' + A : null, Tp = calGParse(ctx.T), mem = {};
  for (var res of [R, A].filter(Boolean)) mem[res] = await calMigMembers(env, dept, res, '$');
  var fixedR = calMigFixed(R), hMarksR = mem[R].filter(function (x) { var p = calGParse(x.m); return p && p.kind === 'mctl' && p.cal === 'h'; }).map(function (x) { return x.m; });
  var hDays = [];
  [R, A].filter(Boolean).forEach(function (res) { mem[res].forEach(function (x) { var p = calGParse(x.m); if (p && p.kind === 'day' && p.cal === 'h') hDays.push({ res: res, m: x.m }); }); });
  var hMarksA = A ? mem[A].filter(function (x) { var p = calGParse(x.m); return p && p.kind === 'mctl' && p.cal === 'h'; }).map(function (x) { return x.m; }) : [];
  if (!hDays.length && !hMarksR.length && !hMarksA.length) return { done: 1 };
  /* العلاماتُ الهجرية كلُّها (صغيرة) ⇐ الميلادية — من الحيّ (والأرشيفُ لا يحمل علامات؛ إن حملها شيئاً فالحيُّ يغلب كما في الوثيقة المنطقية) */
  var headR = (await calMigRead(env, dept, R, calMigHeadRanges('$').concat(calMigMemberRanges('$', hMarksR)), true)) || {}, srcM = {};
  if (A && hMarksA.length) { var hA = (await calMigRead(env, dept, A, calMigHeadRanges('$').concat(calMigMemberRanges('$', hMarksA)), true)) || {}; hMarksA.forEach(function (k) { if (ocOwn(hA, k)) { var p = calGParse(k); srcM[p.y + '-' + p.m] = hA[k]; } }); }
  hMarksR.forEach(function (k) { if (ocOwn(headR, k)) { var p = calGParse(k); srcM[p.y + '-' + p.m] = headR[k]; } });
  var rep0 = calMigRep(), marksG = calMigMarks(srcM, { T: ctx.T, rep: rep0 }, R), head = {};
  Object.keys(headR).forEach(function (k) { if (ocOwn(fixedR, k)) ocSet(head, k, headR[k]); });
  var s = {}; s[R] = Object.keys(head).length + Object.keys(marksG).length;
  if (A) { var headA = (await calMigRead(env, dept, A, calMigHeadRanges('$'), true)) || {}; s[A] = Object.keys(headA).filter(function (k) { return ocOwn(calMigFixed(A), k); }).length; }
  var cnt = {}; [R, A].filter(Boolean).forEach(function (res) { cnt[res] = mem[res].filter(function (x) { var p = calGParse(x.m); return p && p.kind === 'day' && p.cal === 'g'; }).length; });
  var chunk = 8;
  for (var i = 0; i < hDays.length;) {
    if (Date.now() > budget) return { more: 1 };
    var part = hDays.slice(i, i + chunk), st = [], rep = calMigRep(), sums = {}, n2 = {}, keys = [KR + '@*', KR].concat(KA ? [KA + '@*', KA] : []), guards = [revGuard(env, KR, await calMigRev(env, KR))].concat(KA ? [revGuard(env, KA, await calMigRev(env, KA))] : []);
    Object.keys(cnt).forEach(function (k) { n2[k] = cnt[k]; });
    for (var res2 of [R, A].filter(Boolean)) {
      var names = part.filter(function (x) { return x.res === res2; }).map(function (x) { return x.m; }); if (!names.length) continue;
      var got = (await calMigRead(env, dept, res2, calMigHeadRanges('$').concat(calMigMemberRanges('$', names)), true)) || {};
      names.forEach(function (h) {
        if (!ocOwn(got, h)) throw calMigError('calendar-read', res2 + '/' + h);
        var g = calMigDay(h, res2 + '/' + h), v = calMigDayValue(R, got[h], { T: ctx.T, rep: rep }, res2 + '/' + h), G = calGParse(g), to = R;
        if (A && dailyArcClosed(marksG['m:' + calGYm(G.y, G.m)], G.y, G.m, Tp)) to = A;
        var w = {}; ocSet(w, g, v);
        st = st.concat(calMigDrop(env, dept, res2, calMigMemberRanges('$', [h])), calMigMemberRows(env, dept, to, '$', w, g, s[to] + n2[to]++));
        (sums[to] = sums[to] || []).push({ p: g, value: v }); rep.days++;
      });
    }
    Object.keys(sums).forEach(function (to) { st = st.concat(opSummaryStatements(env, opInfo('bsdept:' + dept + ':' + to), sums[to])); });
    var S2 = JSON.parse(JSON.stringify(sum)); calMigSummary(S2, rep);
    try { await calMigCommit(env, guards, st, keys, S2, dept); }
    catch (e) { if (e && e.rs === 'batch-budget' && chunk > 1) { chunk = Math.max(1, chunk >> 1); continue; } throw e; }
    calMigSummary(sum, rep); Object.keys(n2).forEach(function (k) { cnt[k] = n2[k]; }); i += part.length;
  }
  /* أخيراً: العلاماتُ الهجرية تُحذف، والرأسُ والعلاماتُ الميلادية بمواضعها 0..s-1 (صفُّ الجذر يُحدَّث في مكانه — لا حذفَ له فلا يتتابع الحذف) */
  var doc = {}; Object.keys(head).forEach(function (k) { ocSet(doc, k, head[k]); }); Object.keys(marksG).forEach(function (k) { ocSet(doc, k, marksG[k]); });
  var guards2 = [revGuard(env, KR, await calMigRev(env, KR))].concat(KA ? [revGuard(env, KA, await calMigRev(env, KA))] : []), fin = calMigAllRows(env, dept, R, doc);
  var st2 = calMigDrop(env, dept, R, calMigMemberRanges('$', hMarksR)).concat(A && hMarksA.length ? calMigDrop(env, dept, A, calMigMemberRanges('$', hMarksA)) : [], fin.st,
    opSummaryStatements(env, opInfo(KR), Object.keys(marksG).map(function (k) { return { p: k, value: marksG[k] }; })));
  [R, A].filter(Boolean).forEach(function (res) { st2.push(opTag(env.DB.prepare('DELETE FROM ops_period_summary WHERE department_id=?1 AND resource=?2 AND CAST(substr(replace(period,\'m:\',\'\'),1,4) AS INTEGER) BETWEEN 1300 AND 1599').bind(dept, res), ['bsdept:' + dept + ':' + res])); });
  calMigSummary(sum, rep0);
  await calMigCommit(env, guards2, st2, [KR + '@*', KR].concat(KA ? [KA + '@*', KA] : []), sum, dept);
  return { done: 1 };
}
/* أشهرٌ كفترات (الجدول v3 · months في الخطة): كلُّ شهرٍ ميلاديٍّ من مصادره الهجرية في دفعته، ثم تُحذف الأشهرُ الهجرية والرأس (delMonths) أخيراً */
async function calMigMonthsPhase(env, dept, R, ctx, sum, budget) {
  var K = 'bsdept:' + dept + ':' + R, plan = R === 'bassam_plan_v1', C = plan ? '$/f:months' : '$';
  var mem = await calMigMembers(env, dept, R, C), H = mem.filter(function (x) { var p = calGParse(x.m); return p && p.kind === 'month' && p.cal === 'h'; }).map(function (x) { return x.m; }),
    have = {}; mem.forEach(function (x) { have[x.m] = 1; });
  var delH = [];
  if (plan) { delH = (await calMigMembers(env, dept, R, '$/f:delMonths')).filter(function (x) { return calMigH(x.m); }).map(function (x) { return x.m; }); }
  if (!H.length && !delH.length) return { done: 1 };
  var byH = {}, months = {};
  H.forEach(function (h) { var p = calGParse(h); byH[p.y + '-' + p.m] = h; calGMonthsOfH(p.y, p.m).forEach(function (x) { months[x.g] = 1; }); });
  var G = Object.keys(months).sort(), base = mem.filter(function (x) { var p = calGParse(x.m); return !p; }).length;
  /* مواضعُ الأشهر الميلادية: ما يُكتب منها فقط (شهرٌ بلا مصدرٍ ذي قيمة لا عضوَ له) — بالترتيب، فتبقى متصلة */
  for (var i = 0, idx = mem.filter(function (x) { var p = calGParse(x.m); return p && p.cal === 'g'; }).length; i < G.length; i++) {
    var gm = G[i]; if (have[gm]) continue;
    if (Date.now() > budget) return { more: 1 };
    var srcN = calHMonthsOfG(gm).filter(function (x) { return ocOwn(byH, x.h); }), got = (await calMigRead(env, dept, R, calMigHeadRanges(C).concat(calMigMemberRanges(C, srcN.map(function (x) { return byH[x.h]; }))), true)) || {}, src = {};
    var box = plan ? (got.months || {}) : got;
    srcN.forEach(function (x) { if (ocOwn(box, byH[x.h])) src[x.h] = box[byH[x.h]]; });
    var rep = calMigRep(), v = plan ? calMigPlanMonth(gm, src, { T: ctx.T, rep: rep }) : calMigStaffMonth(gm, src, { T: ctx.T, rep: rep }, R + '/' + gm);
    if (v === undefined) continue;
    rep.months++;
    var w = {}, inner = {}; ocSet(inner, gm, v); if (plan) { Object.keys(got).forEach(function (k) { if (k !== 'months') ocSet(w, k, got[k]); }); ocSet(w, 'months', inner); } else w = inner;
    var st = calMigMemberRows(env, dept, R, C, w, gm, base + idx).concat(opSummaryStatements(env, opInfo(K), [{ p: gm, value: v }])), S2 = JSON.parse(JSON.stringify(sum)); calMigSummary(S2, rep);
    await calMigCommit(env, [revGuard(env, K, await calMigRev(env, K))], st, [K, K + '@*'], S2, dept);
    calMigSummary(sum, rep); idx++;
  }
  var st2 = calMigDrop(env, dept, R, calMigMemberRanges(C, H));
  if (plan) {
    /* delMonths (الرأس) ⇐ ميلادية: تُحذف المداخلُ الهجرية وتُكتب الميلادية في حاويتها بمواضع ما بقي ثم الجديد */
    var dm = (await calMigRead(env, dept, R, calMigHeadRanges(C), true)) || {}, del = isObj(dm.delMonths) ? dm.delMonths : {}, conv = calMigPlanMap(del, { T: ctx.T, rep: null }, true, 'plan/delMonths'), keepN = Object.keys(del).filter(function (k) { return !calMigH(k); }).length, j = 0;
    st2 = st2.concat(calMigDrop(env, dept, R, calMigMemberRanges('$/f:delMonths', delH)));
    Object.keys(conv).forEach(function (k) { if (ocOwn(del, k)) return; var w2 = {}, d2 = {}; Object.keys(dm).forEach(function (f) { if (f !== 'delMonths' && f !== 'months') ocSet(w2, f, dm[f]); }); ocSet(d2, k, conv[k]); ocSet(w2, 'months', {}); ocSet(w2, 'delMonths', d2); st2 = st2.concat(calMigMemberRows(env, dept, R, '$/f:delMonths', w2, k, keepN + j++)); });
  }
  st2.push(opTag(env.DB.prepare('DELETE FROM ops_period_summary WHERE department_id=?1 AND resource=?2 AND CAST(substr(period,1,4) AS INTEGER) BETWEEN 1300 AND 1599').bind(dept, R), [K]));
  await calMigCommit(env, [revGuard(env, K, await calMigRev(env, K))], st2, [K, K + '@*'], sum, dept);
  return { done: 1 };
}
/* مواردُ صغيرة (أقفالُ المهام والجدول · dayshift · dayfocus · الجدولُ القديم v2): الوثيقةُ كلُّها في دفعةٍ واحدة */
async function calMigSmallPhase(env, dept, R, ctx, sum) {
  var K = 'bsdept:' + dept + ':' + R, doc = await calMigRead(env, dept, R, [['', '\uffff']], false);
  if (doc === undefined) return { done: 1 };
  var rep = calMigRep(), next = calMigDoc(R, doc, { T: ctx.T, rep: rep });
  if (JSON.stringify(next) === JSON.stringify(doc)) return { done: 1 };
  var st = calMigDrop(env, dept, R, [['$/', '$0']]).concat(calMigAllRows(env, dept, R, next).st);
  calMigSummary(sum, rep);
  await calMigCommit(env, [revGuard(env, K, await calMigRev(env, K))], st, [K], sum, dept);
  return { done: 1 };
}
async function calMigDept(env, d, T, budget) {
  var row = await env.DB.prepare('SELECT v FROM meta WHERE k=?1').bind(CAL_MIG_SUM + d).first(), sum = Object.assign(calMigRep(), parseJson(row && row.v, {}) || {}), ctx = { T: T }, r;
  var plan = [['day', 'bassam_rounds_v1', 'bassam_rounds_arc_v1'], ['day', 'bassam_dreport_v1'], ['day', 'bassam_tasks_v1'], ['mon', 'bassam_staffing_v3'], ['mon', 'bassam_plan_v1'],
    ['small', 'bassam_tasks_locks_v1'], ['small', 'bassam_staffing_locks_v1'], ['small', 'bassam_staffing_v2'], ['small', 'bassam_dayshift_v1'], ['small', 'bassam_dayfocus_v1']];
  for (var p of plan) {
    if (!(await calMigHas(env, d, p[1])) && !(p[2] && await calMigHas(env, d, p[2]))) continue;
    r = p[0] === 'day' ? await calMigDayMapPhase(env, d, p[1], p[2] && (await calMigHas(env, d, p[2])) ? p[2] : null, ctx, sum, budget) : p[0] === 'mon' ? await calMigMonthsPhase(env, d, p[1], ctx, sum, budget) : await calMigSmallPhase(env, d, p[1], ctx, sum);
    if (r.more) return { more: 1, at: p[1], sum: sum };
  }
  /* الاكتمالُ: لا مفتاحَ هجريَّ باقٍ في مورد ⇐ الإدارةُ تخرج من القائمة (ذرّياً مع ملخّصها) */
  await env.DB.batch([env.DB.prepare("UPDATE meta SET v=(SELECT COALESCE(json_group_array(value),'[]') FROM json_each(meta.v) WHERE value<>?1) WHERE k='" + CAL_MIG_PENDING + "'").bind(d),
    env.DB.prepare('INSERT INTO meta(k,v) VALUES(?1,?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v').bind(CAL_MIG_SUM + d, JSON.stringify(Object.assign(sum, { done: 1 })))]);
  logEv('info', 'cal-migrate', { rid: env.__rid, dept: d, days: sum.days, months: sum.months, conflicts: sum.conflicts.length });
  return { ok: 1, sum: sum };
}
async function calMigRoute(env, request, session) {
  if (request.method !== 'POST') return json({ ok: 0, err: 'method' }, 405);
  try {
    var A = await actorOf(env, session.uid); if (!A) return json({ ok: 0, err: 'session' }, 401);
    if (A.u.role !== 'super') return json({ ok: 0, err: 'calendar-migrate-permission' }, 403);
    var body = parseJson(await request.text(), null); if (!isObj(body) || typeof body.dept !== 'string') return json({ ok: 0, err: 'bad-body' }, 400);
    var P = parseJson((((await env.DB.prepare("SELECT v FROM meta WHERE k='" + CAL_MIG_PENDING + "'").first()) || {}).v), []) || [], L = opLayoutPendingOf(await env.DB.prepare("SELECT v FROM meta WHERE k='" + OP_LAYOUT_KEY + "'").first());
    var Trow = await env.DB.prepare("SELECT v FROM meta WHERE k='" + CAL_MIG_TKEY + "'").first(), T = (Trow && Trow.v) || calToday(Date.now()).k;
    var list = body.dept === 'all' ? P.slice() : P.indexOf(body.dept) >= 0 ? [body.dept] : [], out = [], t0 = Date.now(), budget = t0 + Math.min(Math.max(Number(body.budgetMs) || 20000, 1000), 25000);
    for (var d of list) {
      var rep = { dept: d, ok: 0 }, t1 = Date.now();
      /* ترتيبُ الأوامر على قاعدةٍ تحمل 0013 و0014 معاً: calendar-migrate أولاً (يعيد ترميز الموارد المقسومة كلِّها بملخّصاتها) ثم periods-migrate
         (يتحقق ويُخرج الإدارة من ops_layout_pending) — قراءةُ 0013 مرفوضةٌ ما دامت الإدارةُ معلَّقةً تقويمياً */
      if (L.indexOf(d) >= 0) rep.layout = 1;
      try {
        var r = await calMigDept(env, d, T, budget);
        if (r.more) { rep.more = 1; rep.at = r.at; rep.ms = Date.now() - t1; out.push(rep); return json({ ok: 0, more: 1, departments: out, next: { dept: d }, pending: P }); }
        rep.ok = 1; rep.ms = Date.now() - t1; rep.days = r.sum.days; rep.months = r.sum.months; rep.conflicts = r.sum.conflicts; rep.recurring = r.sum.recurring; rep.plan = r.sum.plan; rep.locks = r.sum.locks;
      } catch (e) {
        if (!(e && (e.ocCode || e.rs)) && !dbLimitFailure(e) && !/KIVO_REV_CONFLICT/.test(String(e))) throw e;
        rep.err = e.ocCode || e.rs || (dbLimitFailure(e) || {}).err || 'conflict'; if (e.path) rep.period = e.path;
      }
      out.push(rep);
    }
    var left = parseJson((((await env.DB.prepare("SELECT v FROM meta WHERE k='" + CAL_MIG_PENDING + "'").first()) || {}).v), []) || [];
    return json({ ok: out.every(function (r) { return r.ok; }) ? 1 : 0, departments: out, pending: left });
  } catch (error) { return opRouteError(error); }
}
