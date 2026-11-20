/* V7 · د5-هـ (م6): بياناتُ العرض — المضبوطات: فهرسٌ وإجراءات ومواقع، وتقاريرُ بأصنافها لأيام الشهر (szConvert → szInstallStatements) */
demoProvide({ sys: 'seized', caps: ['seized'], seed: async function (env, C, out) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], emps = C.emps[d] || [], reports = [];
    C.days.forEach(function (day, k) {
      reports.push({ id: C.pre + 'sz_' + d.slice(C.pre.length) + '_' + k, y: day.y, m: day.m, d: day.d, ts: C.now - k * 864e5, loc: C.tag + 'موقع ضبط', no: C.tag + 'محضر ' + (k + 1), note: '',
        shift: C.shifts[0].name, eid: emps[0] ? emps[0].eid : '', name: emps[0] ? emps[0].name : '', actor: C.tag + 'أداة العرض',
        items: [{ id: 23, n: 2 + k, val: 0, act: 'sto', kind: '', kindTxt: '', photos: [] }, { id: 24, n: 1, val: 100, act: 'sto', kind: '', kindTxt: '', photos: [] }] });
    });
    var domain = szConvert(d, { catalog: { ver: 1, cats: [{ name: C.tag + 'نقد', color: '#123456', items: [{ id: 23, name: C.tag + 'عملة', unit: 'sar' }, { id: 24, name: C.tag + 'جهاز', unit: 'pc' }] }] },
      actions: [{ k: 'sto', name: C.tag + 'محفوظ' }], locations: [C.tag + 'موقع ضبط'], jew: [C.tag + 'نوع'], reports: { reports: reports } });
    out.st.push.apply(out.st, szInstallStatements(env, domain)); C.count('seized', 'reports', reports.length);
  }
} });
