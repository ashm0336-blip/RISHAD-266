/* V7 · د5-هـ (م6): بياناتُ العرض — التقريرُ اليومي: أيامٌ بورديتين وحضورِ موظفي الإدارة (الأقدمُ معتمَد) */
demoProvide({ sys: 'dreport', caps: ['dreport'], seed: async function (env, C) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], emps = C.emps[d] || [], doc = {}; if (!emps.length) continue;
    C.days.forEach(function (day, k) {
      var shifts = {};
      C.shifts.forEach(function (s, j) {
        var roster = emps.filter(function (e, q) { return q % C.shifts.length === j; }).map(function (e) { return { ekey: e.eid, st: 'pr', shift: s.name }; });
        shifts[s.name] = Object.assign({ pulled: true, roster: roster }, k > 0 ? { ap: 1, apAt: day.d + '/' + day.m, apBy: C.tag + 'مدير' } : {});
      });
      doc[day.y + '-' + day.m + '-' + day.d] = { created: C.now - k * 864e5, shifts: shifts };
    });
    await C.op('bsdept:' + d + ':bassam_dreport_v1', doc); C.count('dreport', 'days', C.days.length);
  }
} });
