/* ═══ المتابعة اليومية — قراءةٌ معلنة لصفحات القاعدة (V7 · د5-هـ · t2) ═══
   القاعدةُ (موظفو الإدارة · ملفي) لا تسمّي ورقةَ الجولات: تسأل بالاسم. الاسمُ معلنٌ في contract.json ← provides.
   بغياب هذا الملف القراءةُ تعيد undefined، فتُطفأ ما يخصّ الجولات عند كل مستهلك (سلوكُ الغياب في src/contracts/_base.json).
     read     daily.usable@1()   هل «الجولات» (daily/rounds) مفعَّلةٌ في الإدارة النشطة — true إن تعذّر السؤال (كما كان). */
(function () {
  KIVO.bus.provide('daily.usable@1', function () { try { var P = KIVO.BassamPerm; return !P || !P.on || !!P.on('daily/rounds'); } catch (e) { return true; } });
})();
