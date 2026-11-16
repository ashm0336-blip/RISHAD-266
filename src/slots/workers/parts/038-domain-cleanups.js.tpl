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
@@SYS:cleanup.award.fn@@/* عهد الموظفين: تفريغ moves وحدها (كما يفعل المساران) دون مساسٍ بالعهد نفسها */
function custodyCleanup(A, k, newVal, curVal, ctx) {
  if (resName(k) !== 'bassam_custody_v1') return false;
  if (newVal == null || curVal == null) return false;
  var nv = parseJson(newVal, null), ov = parseJson(curVal, null);
  if (!isObj(nv) || !isObj(ov)) return false;
  if (!(Array.isArray(nv.moves) && !nv.moves.length)) return false;
  if (!(Array.isArray(ov.moves) && ov.moves.length)) return false;
  var c1 = {}, c2 = {}, q;                                    /* وما سوى moves متطابقٌ حرفاً */
  for (q in ov) if (q !== 'moves') c1[q] = ov[q];
  for (q in nv) if (q !== 'moves') c2[q] = nv[q];
  if (!deq(c1, c2)) return false;
  return !!wipeAllowed(A, parseKey(k).dept, ctx);
}
