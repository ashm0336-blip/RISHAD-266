/* ══ تنظيفان مجاليّان ضيّقان — مساران مستقلّان لا شرطٌ عامّ ═══════════════
   (أ) employeeWipeCleanup — «حذف جميع الموظفين»: يُشترط أن يكون سجل موظفي
       الإدارة قد صار فارغاً في هذا الطلب نفسه، وأن يملك الفاعل emps/data:del.
   (ب) importResetCleanup — «حذف الكل واستيراد ملف»: لا يُشترط فراغ السجل،
       لأن مسار الاستبدال يحفظ القائمة النهائية (finalList) قبل تنظيف التقارير.
       ويملكه صاحب admin/import:del وحده.
   وكلاهما تحويلٌ واحد لا غير: أيُّ قيمةٍ حالية ⇐ الشكل الفارغ القانوني.
   ولا يمنحان أيَّ كتابةٍ أخرى في المورد، ولا حذفَ مفتاح. */
function wipeAllowed(A, dept, ctx) {
  if (actsHeldOn(A, dept, 'admin/import', ['del'])) return 'import';      /* (ب) */
  if (ctx && ctx.empsEmpty === true && actsHeldOn(A, dept, 'emps/data', ['del'])) return 'emps';  /* (أ) */
  return '';
}
function dreportCleanup(A, k, newVal, curVal, ctx) {
  if (resName(k) !== 'bassam_dreport_v1') return false;
  if (newVal == null || curVal == null) return false;
  var nv = parseJson(newVal, null);
  if (!isObj(nv) || Object.keys(nv).length) return false;     /* الجديد {} حرفاً ودلالة */
  return !!wipeAllowed(A, parseKey(k).dept, ctx);
}
@@SYS:cleanup.award.fn@@@@SYS:cleanup.custody.fn@@