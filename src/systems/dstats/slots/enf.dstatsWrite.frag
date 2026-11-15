/* ── الإحصائياتُ اليومية (عامّ): الشكلُ والأقفال كما dstatsRule، والقرارُ بمفاتيح الإدخال/الاعتماد/إعادة الفتح بإدارات الفاعل + Source + DateRange (D4-02: لا استثناءَ لمدير النظام) ── */
function enfDstatsWrite(A, k, newVal, curVal, ctx, X) {
  var n = parseJson(newVal, null), o = curVal == null ? {} : parseJson(curVal, null), top = {}, q, kk;
  if (!isObj(n) || !isObj(o)) return enfNo('dstats');
  Object.keys(n).concat(Object.keys(o)).forEach(function (x) { top[x] = 1; });
  for (kk in top) {
    if (deq(o[kk], n[kk])) continue;
    if (DS_SITES.indexOf(kk) !== -1) {
      var a9 = o[kk] === undefined ? {} : o[kk], b9 = n[kk] === undefined ? {} : n[kk];
      if (!isObj(a9) || !isObj(b9)) return enfNo('dstats');
      for (q in b9) if (!deq(a9[q], b9[q]) && (!/^\d{4}-\d{2}-\d{2}$/.test(q) || !dsDayOk(b9[q]))) return enfNo('dstats');
      continue;
    }
    if (kk === 'locks') {
      var la = o.locks === undefined ? {} : o.locks, lb = n.locks === undefined ? {} : n.locks;
      if (!isObj(la) || !isObj(lb)) return enfNo('dstats');
      for (q in lb) if (!deq(la[q], lb[q]) && (!/^(haram|nabawi)\|\d{4}-\d{1,2}$/.test(String(q)) || !dsLockOk(lb[q]))) return enfNo('dstats');
      for (q in la) if (lb[q] === undefined && !/^(haram|nabawi)\|\d{4}-\d{1,2}$/.test(String(q))) return enfNo('dstats');
      continue;
    }
    if (A.u.role !== 'super') return enfNo('super');
  }
  var sup = A.u.role === 'super';
  var r = enfDecide(A, k, K_DSTATS, '', o, n, curVal, newVal, ctx, X, {
    held: function (key) { return sup || enfHeldAnyDept(A, key); },
    techOk: function () { return sup || enfHeldAnyDept(A, 'dstats.haram.entry') || enfHeldAnyDept(A, 'dstats.nabawi.entry'); }, noVia: true });
  return r;
}
