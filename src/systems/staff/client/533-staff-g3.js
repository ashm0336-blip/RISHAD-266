/* ═══ الجدول الشهري — قراءاتٌ معلنة لصفحات القاعدة (V7 · د5-د2) ═══
   صفحاتُ القاعدة (موظفو الإدارة · ملفي · الاستيراد · اليوم المختار) لا تسمّي مفاتيحَ الجدول ولا ورقتَه: تسأل بالاسم. كلُّ اسمٍ معلنٌ في
   contract.json ← provides.read. بغياب هذا الملف القراءةُ تعيد undefined وكلُّ مستهلكٍ كتب سلوكَ الغياب عنده.
     read  staff.usable@1()      هل الجدولُ مفعَّلٌ في الإدارة النشطة (ورقتُه في سقف الإدارة) — true إن تعذّر السؤال (كما كان).
     read  staff.months@1(how)   وثيقةُ الأشهر { "سنة-شهر": { مفتاحُ الموظف: { shift, rest, cs, muk … } } }.
     read  staff.locks@1(how)    الأشهرُ المعتمدة { "سنة-شهر": true }.
   how: بلا قيمة = القيمةُ كما هي (ترمي إن لم تُقرأ بعد أو حُجبت — كقراءة المورد نفسِه) · "copy" = نسخةٌ مستقلة ·
        "granted" = undefined إن حُجبت القراءة · "ready" = null ما لم تكن القراءةُ جاهزة. */
(function () {
  var bus = KIVO.bus;
  function doc(key, how) {
    if (typeof how === 'function') return how(key);                    /* د5-د2: قارئُ الصفحة السائلة (كما كانت تقرأ) */
    if (how && typeof how.get === 'function') return how.get(key);       /* مسودةُ المستدعي: القراءةُ تُسجَّل في حفظه */
    var S = KIVO.__BS_SRV.operations;
    if (how === 'granted' && S.state(key) === 'denied') return undefined;
    if (how === 'ready') return S.state(key) === 'ready' ? S.get(key) : null;
    var v = S.get(key);
    return how === 'copy' && v != null ? JSON.parse(JSON.stringify(v)) : v;
  }
  bus.provide('staff.usable@1', function () { try { var P = KIVO.BassamPerm; return !P || !P.on || !!P.on('staff'); } catch (e) { return true; } });
  bus.provide('staff.months@1', function (how) { return doc('bassam_staffing_v3', how); });
  bus.provide('staff.locks@1', function (how) { return doc('bassam_staffing_locks_v1', how); });
})();
