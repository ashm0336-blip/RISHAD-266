/* ═══ الجدول الشهري — قراءاتٌ معلنة لبرامجَ أخرى تحتاج الجدولَ نفسَه (V7 · د5-د2) ═══
   كلُّ ما هنا معلنٌ في عقد البرنامج (src/systems/staff/contract.json ← provides.read). البرامجُ الأخرى (التقرير اليومي · التشغيل الميداني ·
   الجولات · المهام · الاسترشاد · المضبوطات · العهد) لا تسمّي مفاتيحَ الجدول: تسأل بالاسم. بغياب هذا الملف القراءةُ تعيد undefined وسلوكُ كلِّ
   مستهلكٍ عند الغياب مكتوبٌ في عقده هو (consumes ← absent).
   «via» اختياريّ — طريقُ القراءة الذي كان المستهلكُ يقرأ به، ليبقى السلوكُ حرفاً بحرف:
       بلا via            قراءةُ Operations المباشرة (operations.get) — ترمي ما كانت ترميه إن لم يُقرأ الموردُ أو مُنع.
       مسودة ({ get })    القراءةُ داخل مسودة المستدعي (draft.get): تسجّل اعتمادَ القراءة في حفظه الذرّي كما كان.
       دالة (name ⇒ قيمة)  قارئُ صفحة المستدعي (مسودةُ الصفحة أو ذاكرتُها): المالكُ يسمّي المفتاح والصفحةُ تقرأ بطريقتها.
     read  staff.schedule@1(via?)     الجدولُ كلُّه { 'Y-M': { مفتاحُ الموظف: صفّ } } كما هو مخزَّن (أو null إن لم يُنشأ).
     read  staff.locks@1(via?)        الأشهرُ المعتمدة { 'Y-M': true } (أو null).
     read  staff.callsigns@1(via?)    قائمةُ رموز النداء (أو null).
     read  staff.enabled@1(page?)     هل الجدولُ مفعَّلٌ في الإدارة النشطة (مفتاحُ النظام) — true/false. page: الصفحةُ السائلة، فيُسأل bsOn نفسُها كما كانت تسأل.
     read  staff.resources@1(…kinds)  أسماءُ موارد الجدول بحسب النوع: schedule · legacy · snap · locks · callsigns · permLimit (بلا نوعٍ: كلُّها). */
(function () {
  var bus = KIVO.bus;
  var RES = { schedule: 'bassam_staffing_v3', legacy: 'bassam_staffing_v2', snap: 'bassam_staffing_snap_v1', locks: 'bassam_staffing_locks_v1', callsigns: 'bassam_callsigns_v1', permLimit: 'bassam_perm_limit_v1' };
  function via(how, key) {
    if (typeof how === 'function') return how(key);
    if (how && typeof how.get === 'function') return how.get(key);
    return KIVO.__BS_SRV.operations.get(key);
  }
  bus.provide('staff.schedule@1', function (how) { return via(how, RES.schedule); });
  bus.provide('staff.locks@1', function (how) { return via(how, RES.locks); });
  bus.provide('staff.callsigns@1', function (how) { return via(how, RES.callsigns); });
  bus.provide('staff.enabled@1', function (page) {
    if (page && typeof page.bsOn === 'function') return page.bsOn('staff');
    try { var P = KIVO.BassamPerm; return !P || !P.on || !!P.on('staff'); } catch (e) { return true; }
  });
  bus.provide('staff.resources@1', function () {
    var kinds = arguments.length ? Array.prototype.slice.call(arguments) : Object.keys(RES);
    return kinds.map(function (kind) { return RES[kind]; }).filter(Boolean);
  });
})();
