/* ═══ V7 · د6: ما يوفّره نظامُ المضبوطات لغيره عبر الناقل (src/core/060-bus.js) — قراءةٌ واحدة ═══
   seized.usable@1 () ← هل نظامُ المضبوطات مفعَّلٌ في الإدارة النشطة (ورقتُه في سقفها) — يقرؤه «رصد الحالات» ليُظهر تنبيهَ «ممنوعات»
   (تسجيلُ القطع في المضبوطات) ورابطَه. بغياب هذا الملف (حذفُ النظام) تعيد القراءةُ undefined فلا يظهر التنبيه. */
(function () {
  var bus = KIVO.bus;
  if (!bus) return;
  bus.provide('seized.usable@1', function () {
    try { var P = KIVO.BassamPerm; return !P || !P.on || !!P.on('seized'); } catch (e) { return false; }
  });
})();
