/* ═══ الجدول الشهري — ما يوفّره لغيره عبر الناقل (V7 · د5-د) ═══
   كلُّ ما هنا معلنٌ في عقد البرنامج (src/systems/staff/contract.json ← provides). غيرُه لا يقرأ مفاتيحَ الجدول ولا يكتبها: يسأل بالاسم.
   بغياب هذا الملف (البرنامجُ محذوف) القراءةُ تعيد undefined والأمرُ { ok:0, absent:1 } والحدثُ يمرّ بلا مشارك — وسلوكُ كلِّ مستهلكٍ
   عند الغياب مكتوبٌ في عقده هو (consumes ← absent).
     read        staff.dayFacts@1(y, m, d)        وقائعُ يومٍ لكل موظف (وردية · راحة · تكليف · صفّ) — من الجدول الحي أو من التقرير المسحوب.
     read        staff.availText@1(shift, today)  «متاح / غير متاح» بحسب وقت الوردية.
     read        staff.permLimit@1()              حدُّ الاستئذانات الشهري المحفوظ (0–31)، أو undefined إن لم يُحفظ حدّ.
     read        staff.shiftUsage@1(shift)        كم مسكَّناً على الوردية وفي كم شهر، والأشهرُ المعتمدة منها — لصفحة إعدادات الورديات.
     command     staff.callsign.set@1             { month, changes:[{ ekey, cs, ifCs? }] } داخل مسودة المستدعي: يكتب cs وحده.
     participant shifts.renamed@1                 { from, to, deleting } داخل مسودة إعادة التسمية: يعيد تسمية الوردية في كل شهرٍ مفتوح. */
(function () {
  var bus = KIVO.bus;
  function ops() { return KIVO.__BS_SRV.operations; }
  /* هل الجدولُ مفعَّلٌ في الإدارة النشطة (مفتاحُ النظام)؟ */
  function on() { try { var P = KIVO.BassamPerm; return !P || !P.on || !!P.on('staff'); } catch (e) { return true; } }

  bus.provide('staff.dayFacts@1', function (y, m, d) { return KIVO.BassamDay.of(y, m, d); });
  bus.provide('staff.availText@1', function (shift, isToday) { return KIVO.BassamDay.availTxt(shift, isToday); });

  bus.provide('staff.permLimit@1', function () {
    try {
      var v = ops().get('bassam_perm_limit_v1');
      var n = typeof v === 'number' || typeof v === 'string' ? parseInt(v, 10) : NaN;
      return isFinite(n) ? Math.min(31, Math.max(0, n)) : undefined;
    } catch (e) { return undefined; }
  });

  bus.provide('staff.shiftUsage@1', function (shift) {
    var out = { on: on(), records: 0, months: 0, locked: [] }, seen = {};
    /* V7 · د5-ح (السببُ الجذري لاختفاء «الإعدادات ← الورديات»): كانت أقفالُ الجدول تُقرأ قبل سؤال «هل الجدولُ مفعَّل؟» — وبإطفائه للإدارة
       لا يقرأ الخادمُ مواردَه (سقفُ القراءة)، فرمت القراءةُ «operations-read-required» من داخل renderVals فصارت صفحةُ «الإعدادات» كلُّها فارغة.
       الجدولُ المطفأ لا يُقرأ منه شيء: لا تسكين على الوردية */
    if (!out.on) return out;
    try {
        var locks = ops().get('bassam_staffing_locks_v1') || {};
        var all = ops().get('bassam_staffing_v3') || {};
        Object.keys(all).forEach(function (month) {
          var bucket = all[month], hit = 0;
          if (!bucket || typeof bucket !== 'object') return;
          Object.keys(bucket).forEach(function (emp) { if (emp !== '__shifts' && bucket[emp] && bucket[emp].shift === shift) { out.records++; seen[month] = 1; hit++; } });
          if (hit && locks[month]) out.locked.push(month);
        });
      } catch (e) { /* كما كان: قراءةٌ تعذّرت ⇒ ما عُدّ حتى الآن */ }
    out.months = Object.keys(seen).length;
    return out;
  });

  bus.command('staff.callsign.set@1', function (payload, draft) {
    if (!draft || typeof draft.get !== 'function' || typeof draft.set !== 'function') throw Error('bus-draft-required: staff.callsign.set@1');
    var staffing = draft.get('bassam_staffing_v3') || {}, month = payload.month, bucket = Object.assign({}, staffing[month] || {}), changed = false;
    (payload.changes || []).forEach(function (c) {
      if (!c || !c.ekey) return;
      if (c.ifCs !== undefined && !(bucket[c.ekey] && bucket[c.ekey].cs === c.ifCs)) return;   /* إزالةُ رمزٍ عن حامله السابق: فقط إن كان ما زال يحمله */
      bucket[c.ekey] = Object.assign({}, bucket[c.ekey] || {}, { cs: c.cs || '' }); changed = true;
    });
    if (changed) { staffing[month] = bucket; draft.set('bassam_staffing_v3', staffing); }
    return { ok: 1, changed: changed };
  });

  bus.participant('shifts.renamed@1', function (event, draft) {
    if (!on()) return;
    var locks = draft.get('bassam_staffing_locks_v1') || {}, all = draft.get('bassam_staffing_v3') || {}, changed = false;
    Object.keys(all).forEach(function (month) {
      var bucket = all[month];
      if (!bucket || typeof bucket !== 'object') return;
      Object.keys(bucket).forEach(function (emp) {
        if (emp === '__shifts' || !bucket[emp] || bucket[emp].shift !== event.from) return;
        if (locks[month]) { if (event.deleting) throw Error('locked-month'); return; }
        bucket[emp] = Object.assign({}, bucket[emp], { shift: event.to }); changed = true;
      });
    });
    if (changed) draft.set('bassam_staffing_v3', all);
  });
})();
