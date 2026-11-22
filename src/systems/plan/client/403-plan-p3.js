/* ═══ التشغيل الميداني — قراءاتٌ وأمرٌ معلنة لصفحات القاعدة (V7 · د5-هـ · p3) ═══
   صفحاتُ القاعدة (موظفو الإدارة · ملفي · عُدّة الصفحات المشتركة) لا تسمّي مفاتيحَ التشغيل الميداني ولا ورقتَه: تسأل بالاسم. كلُّ اسمٍ معلنٌ في
   contract.json ← provides. بغياب هذا الملف القراءةُ تعيد undefined والأمرُ { ok:0, absent:1 }، وكلُّ مستهلكٍ كتب سلوكَ الغياب عنده.
     read     plan.usable@1()          هل التشغيلُ الميداني مفعَّلٌ في الإدارة النشطة (ورقتُه في سقف الإدارة) — true إن تعذّر السؤال (كما كان).
     (plan.doc@1 يقدّمه 404-plan-p4.js وحده، وفيه طرقُ how هنا: granted · text.)
     read     plan.sites@1(ym, how)    مواقعُ شهرٍ «سنة-شهر» (مصفوفةُ الشهر أو حقلُها d) أو null إن لم تكن للشهر خطة.
     read     plan.markKinds@1()       نصُّ كتالوج أنواع المعالم كما هو مخزَّن (أو null).
     command  plan.markKinds.set@1({ kinds }, draft)   يكتب الكتالوجَ داخل مسودة المستدعي.
   how: بلا قيمة = القيمةُ كما هي (ترمي إن لم تُقرأ بعد — كقراءة المورد نفسِه) · "granted" = undefined إن حُجبت القراءة ·
        "text" = نسخةٌ من نصّ المورد (JSON.parse) أو null. */
(function () {
  var bus = KIVO.bus, KINDS = 'bassam_mark_kinds_v1';
  bus.provide('plan.usable@1', function () { try { var P = KIVO.BassamPerm; return !P || !P.on || !!P.on('plan'); } catch (e) { return true; } });
  bus.provide('plan.sites@1', function (ym, how) {
    var m = ((bus.read('plan.doc@1', how) || {}).months || {})[ym];
    return m ? (Array.isArray(m) ? m : m.d) : null;
  });
  bus.provide('plan.markKinds@1', function () { return KIVO.__BS_SRV.operations.text(KINDS); });
  bus.command('plan.markKinds.set@1', function (p, draft) { draft.set(KINDS, p.kinds); return { ok: 1 }; });
})();
