/* ══ سجل عمليات الدومين — OPS ══════════════════════════════════════════════
   استُخرج من الواجهة نفسها: كلُّ كتابةٍ محروسةٍ بـPC("approve") وُصف موضعها في
   بنية التخزين. فالاعتماد لم يعد يُخمَّن من لواحق أسماء حقول، بل عمليةٌ معلَنة
   بمسارها. النمط: مقاطع بينها نقاط · «*» مقطعٌ واحدٌ أيّاً كان · «**» المورد كلّه.
     الخطة   : اعتماد الموقع (floors[i].approved ومرآته في لقطة الشهر) وقفل الشهر
     الجولات : setShiftAp · اعتماد اليوم ومواقعه · اعتماد الشهر وفتح أيامه
     التقرير : اعتماد وردية اليوم (ap/apAt/apBy) وفتح اليوم وإغلاقه
     الأقفال : أقفال الجدول الشهري والمهام وسقف الاستئذان — الموردُ كلُّه اعتماد
     الجائزة : انتقال حالة الترشيح (st) وحده اعتماد */
var OPS = {
  'bassam_plan_v1':            { approve: ['floors.*.approved', 'months.*.mo', 'months.*.d.*.approved'], newAp: ['months.*.mo'], shape: 'plan' },
  'bassam_rounds_v1':          { approve: ['*.shAp', '*.shAp.*', '*.ap', '*.auto', '*.mo', '*.d.*.ap', '*.dopen', '*.dopen.*', '*.dshut', '*.dshut.*'], newAp: ['*.ap', '*.mo', '*.dopen.*', '*.dshut.*'], shape: 'rounds' },
  'bassam_dreport_v1':         { approve: ['*.shifts.*.ap', '*.shifts.*.apAt', '*.shifts.*.apBy', '*.dopen', '*.dopen.*', '*.dshut', '*.dshut.*'], newAp: ['*.dopen.*', '*.dshut.*'], shape: 'dreport' },
  'bassam_staffing_locks_v1':  { approve: ['**'] },
  'bassam_tasks_locks_v1':     { approve: ['**'] },
  'bassam_perm_limit_v1':      { approve: ['**'] },
  'bassam_award_v1':           { approve: ['recs.*.st'], shape: 'award' }
};
function opsOf(k) { return OPS[resName(k)] || null; }
function opAll(O) { return !!(O && O.approve && O.approve.indexOf('**') !== -1); }
function opMatch(pats, path) {
  for (var i = 0; i < pats.length; i++) {
    var ps = pats[i].split('.');
    if (ps.length !== path.length) continue;
    var ok = true;
    for (var j = 0; j < ps.length; j++) if (ps[j] !== '*' && ps[j] !== path[j]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}
function opPrefix(pats, path) {
  for (var i = 0; i < pats.length; i++) {
    var ps = pats[i].split('.');
    if (ps.length <= path.length) continue;
    var ok = true;
    for (var j = 0; j < path.length; j++) if (ps[j] !== '*' && ps[j] !== path[j]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}
/* يفصل قيمة المورد إلى: ما ليس اعتماداً (c) وإسقاطُ مواضع الاعتماد وحدها (a) */
function splitOps(v, pats, path) {
  if (!isObj(v) && !Array.isArray(v)) return { c: v, a: undefined };
  var isA = Array.isArray(v), c = isA ? [] : {}, ap = isA ? [] : {}, has = false;
  var keys = isA ? null : Object.keys(v), n = isA ? v.length : keys.length;
  for (var i = 0; i < n; i++) {
    var k = isA ? String(i) : keys[i], p2 = path.concat([k]);
    if (opMatch(pats, p2)) { ap[k] = v[k]; if (isA) c[k] = null; has = true; continue; }
    if (opPrefix(pats, p2)) {
      var r = splitOps(v[k], pats, p2);
      c[k] = r.c;
      if (r.a !== undefined) { ap[k] = r.a; has = true; }
      continue;
    }
    c[k] = v[k];
  }
  return { c: c, a: has ? ap : undefined };
}
/* هل تحت هذه القيمة موضعُ اعتمادٍ غيرُ فارغ؟ — للحاوية التي وُلدت أو زالت */
function opsAny(v, pats, path) {
  if (!isObj(v) && !Array.isArray(v)) return false;
  var isA = Array.isArray(v), keys = isA ? null : Object.keys(v), n = isA ? v.length : keys.length;
  for (var i = 0; i < n; i++) {
    var k = isA ? String(i) : keys[i], p2 = path.concat([k]);
    if (opMatch(pats, p2)) { if (!isEmptyVal(v[k])) return true; continue; }
    if (opPrefix(pats, p2) && opsAny(v[k], pats, p2)) return true;
  }
  return false;
}
