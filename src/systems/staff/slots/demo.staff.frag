/* V7 · د5-هـ (م6): بياناتُ العرض — جدولُ التشغيل: وردياتُ موظفي كلِّ إدارةٍ تجريبية للشهر الحالي والسابق */
demoProvide({ sys: 'staff', caps: ['staff'], seed: async function (env, C) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], month = {}, n = 0;
    (C.emps[d] || []).forEach(function (e, j) { month[e.eid] = { shift: C.shifts[j % C.shifts.length].name, rest: [], leaves: {}, perm: {}, cs: '', muk: false }; n++; });
    var doc = {}; doc[C.mk] = month; doc[C.pmk] = C.copy(month);
    await C.op('bsdept:' + d + ':bassam_staffing_v3', doc); C.count('staff', 'assignments', n * 2);
  }
} });
