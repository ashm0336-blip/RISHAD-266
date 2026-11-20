/* V7 · د5-هـ (م6): بياناتُ العرض — الجولاتُ اليومية: أيامٌ من الشهر الحالي على مواقع الإدارة، بحالات رصدٍ مفتوحة ومغلقة */
demoProvide({ sys: 'daily', caps: ['daily'], seed: async function (env, C) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], floors = C.sites[d] || [], doc = {}; if (!floors.length) continue;
    C.days.forEach(function (day, k) {
      var fs = C.copy(floors);
      fs.forEach(function (f) { if (f.zones[0]) Object.assign(f.zones[0], { fst: 'open', fAt: C.now - k * 864e5 }); if (f.zones[1]) Object.assign(f.zones[1], { fst: 'closed', cWhy: C.tag + 'صيانة', fAt: C.now - k * 864e5 + 1000 }); });
      doc[day.y + '-' + day.m + '-' + day.d] = { t: C.now - k * 864e5, d: fs, shAp: {} };
    });
    await C.op('bsdept:' + d + ':bassam_rounds_v1', doc); C.count('daily', 'days', C.days.length);
  }
} });
