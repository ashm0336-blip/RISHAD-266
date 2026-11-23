/* V7 · د5-هـ (م6): بياناتُ العرض — الإحصائياتُ اليومية (سجلٌّ عامٌّ للمنصة): أيامٌ من الشهر الحالي الخاليةُ وحدها تُملأ بقيمٍ موسومة TEST_ONLY،
   ولا يُمسّ يومٌ له قيمة (dsDomainStatements من فارغٍ إلى أيام العرض — إدراجٌ لا استبدال) */
demoProvide({ sys: 'dstats', caps: ['dstats'], seed: async function (env, C, out) {
  var cur = (await dsDomainRead(env)).data, next = { haram: {}, nabawi: {}, locks: {} }, n = 0;
  DS_SITES.forEach(function (site, s) {
    C.days.forEach(function (day, k) {
      var key = day.y + '-' + String(day.m).padStart(2, '0') + '-' + String(day.d).padStart(2, '0');
      if (cur[site] && cur[site][key] !== undefined) return;
      /* V7 · د6 (QA): كلُّ يومٍ بحقول مسجده وحده (DS_FIELDS — كان umrah يُكتب للنبوي) وببصمةٍ بشكل بصمة الصفحة { n · u · t: وقتٌ رقمي }
         (كانت t نصاً) — فيقبل الخادمُ كلَّ حفظٍ بعد الزرع؛ ووسمُ العرض في n/u يبقى، فالحذفُ يعرف صفوفه */
      var day0 = { worshippers: 1000 * (s + 1) + 10 * k, __m: { n: C.tag + 'أداة العرض', u: DEMO_PRE + 'tool', t: C.now - k * 864e5 } };
      day0[DS_FIELDS[site][1]] = 100 + k;
      next[site][key] = day0; n++;
    });
  });
  if (!n) return;
  out.st.push.apply(out.st, dsDomainStatements(env, { haram: {}, nabawi: {}, locks: {} }, next)); out.revKeys.push(K_DSTATS); C.count('dstats', 'days', n);
} });
