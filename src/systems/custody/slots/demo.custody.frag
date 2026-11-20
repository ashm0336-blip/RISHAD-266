/* V7 · د5-هـ (م6): بياناتُ العرض — العُهَد: أصنافٌ وتسليمٌ لموظفي الإدارة (cuConvert → cuBulk) */
demoProvide({ sys: 'custody', caps: [], seed: async function (env, C, out) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], emps = C.emps[d] || [], T = C.today;
    var doc = { items: [{ name: C.tag + 'جهاز لاسلكي', qty: 5 }, { name: C.tag + 'سترة', qty: 10 }],
      moves: emps.slice(0, 2).map(function (e, j) { return { t: 'out', eid: e.eid, item: j ? C.tag + 'سترة' : C.tag + 'جهاز لاسلكي', ser: 'TST-D' + (i + 1) + '0' + (j + 1), y: T.y, m: T.m, d: T.d }; }) };
    var rows = cuConvert(d, doc);
    Object.keys(CU_TABLES).forEach(function (k) { out.st.push.apply(out.st, cuBulk(env, CU_TABLES[k][0], CU_TABLES[k][1], rows[k])); });
    C.count('custody', 'items', rows.items.length); C.count('custody', 'issued', rows.moves.length);
  }
} });
