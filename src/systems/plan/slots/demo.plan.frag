/* V7 · د5-هـ (م6): بياناتُ العرض — الخطةُ التشغيلية: مواقعُ (طوابق) بمصلياتها وبواباتها ومعالمها ومساراتها لكل إدارةٍ تجريبية، وخطةُ الشهر */
demoProvide({ sys: 'plan', caps: ['plan'], seed: async function (env, C) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], floors = C.sites[d] || []; if (!floors.length) continue;
    var doc = { floors: C.copy(floors), months: {}, zones: C.copy(floors[0].zones), gates: C.copy(floors[0].gates), marks: C.copy(floors[0].marks), paths: C.copy(floors[0].paths) };
    doc.months[C.mk] = { c: 1, d: C.copy(floors) };
    await C.op('bsdept:' + d + ':bassam_plan_v1', doc); C.count('plan', 'sites', floors.length);
    C.count('plan', 'zones', floors.reduce(function (n, f) { return n + f.zones.length; }, 0));
  }
} });
