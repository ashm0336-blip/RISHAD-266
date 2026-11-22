/* V7 · د5-هـ (م6): بياناتُ العرض — الإرشاد: تقاريرُ اليوم والأيام السابقة بلغاتها ومواقعها، بكاتب النظام (irConvert → irInstallStatements) */
demoProvide({ sys: 'irshad', caps: ['irshad'], seed: async function (env, C, out) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], emps = C.emps[d] || [], reports = [];
    C.days.forEach(function (day, k) {
      emps.slice(0, 3).forEach(function (e, j) {
        reports.push({ id: C.pre + 'ir_' + d.slice(C.pre.length) + '_' + k + j, y: day.y, m: day.m, d: day.d, ts: C.now - k * 864e5 - j * 60000, shift: C.shifts[j % C.shifts.length].name,
          eid: e.eid, name: e.name, loc: C.tag + 'موقع إرشاد', actor: C.tag + 'أداة العرض', bro: 2 + j, pros: j % 2, pol: 0, langs: [{ lang: C.tag + 'لغة', count: 3 + j }] });
      });
    });
    var domain = irConvert(d, { reports: { reports: reports }, languages: [C.tag + 'لغة'], locations: [C.tag + 'موقع إرشاد'] });
    out.st.push.apply(out.st, irInstallStatements(env, domain)); C.count('irshad', 'reports', reports.length);
  }
} });
