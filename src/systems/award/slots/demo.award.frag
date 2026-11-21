/* V7 · د5-هـ (م6): بياناتُ العرض — الجائزة: ترشيحاتُ موظفي الإدارة (awConvert → awInstallStatements) */
demoProvide({ sys: 'award', caps: ['award'], seed: async function (env, C, out) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], emps = C.emps[d] || [], recs = emps.slice(0, 3).map(function (e, j) {
      return { id: C.pre + 'aw_' + d.slice(C.pre.length) + '_' + j, ekey: e.eid, cat: C.tag + 'فئة', hij: C.today.y + '-' + C.today.m + '-' + C.today.d, score: 70 + j, st: 'قيد التحكيم', declName: e.name };
    });
    if (!recs.length) continue;
    var domain = awConvert(d, { records: { recs: recs } });
    out.st.push.apply(out.st, awInstallStatements(env, domain)); C.count('award', 'nominations', recs.length);
  }
} });
