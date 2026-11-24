/* V7 · د5-هـ (م6): بياناتُ العرض — المهام: مهامٌ اليوم وأمس لموظفي الإدارة (تنتظر · جارية · منجزة) ومهمةٌ عامة */
demoProvide({ sys: 'tasks', caps: ['tasks'], seed: async function (env, C) {
  var H = 3600 * 1000, seq = 0;
  function row(o) {   /* الشكلُ القائم (22 عموداً) — العمود 13 هويةُ الصف · 14 مفتاحُ المسند */
    var nm = o.e ? o.e.name : '';
    return [C.tag + o.title, '', 'normal', o.st || 'pending', 'normal', 'مضافة', o.perf || null, o.e ? [nm.charAt(0)] : [], nm, C.tag + 'أداة العرض', 60, o.acc || null, o.fin || null,
      C.now - 864e5 * 30 + (++seq) * 1000, o.e ? o.e.eid : null, o.s || null, o.f || null, null, null, null, null, null];
  }
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], emps = C.emps[d] || [], doc = {}, n = 0, T = C.days[0], Y = C.days[1] || C.days[0];
    var DT = calGKey(T.y, T.m, T.d), DY = calGKey(Y.y, Y.m, Y.d);   /* V7 · 53 تقويم: ISO */
    doc[DT] = []; if (DY !== DT) doc[DY] = [];
    emps.forEach(function (e, j) {
      doc[DT].push(row({ title: 'مهمة اليوم ' + (j + 1), e: e, st: j % 2 ? 'in_progress' : 'pending', acc: j % 2 ? C.now - H / 2 : null, s: C.now - H, f: C.now + 3 * H })); n++;
      doc[DY].push(row({ title: 'مهمة أمس ' + (j + 1), e: e, st: 'done', acc: C.now - 25 * H, fin: C.now - 24.5 * H, perf: ['on_time', 'في الوقت'], s: C.now - 26 * H, f: C.now - 24 * H })); n++;
    });
    doc[DT].push(row({ title: 'مهمة عامة', s: C.now - H, f: C.now + 5 * H })); n++;
    await C.op('bsdept:' + d + ':bassam_tasks_v1', doc); C.count('tasks', 'tasks', n);
  }
} });
