/* ══ سجل الكيانات ENT — جردٌ من الواجهة الفعلية لكل مورد ══════════════════════
   لكل مورد: شكلُ جذره القانوني · مجموعاته وهويةُ عناصرها · قوائمه البدائية ·
   ما يُلحق به · ما يُعاد تسميته · ما يتبنّى هويةً قانونية.
     cols[].at    : موضع المجموعة ('' للجذر)
     cols[].idf   : سلسلة المفاتيح التي تطابق بها الواجهة عنصراً بعنصر
     cols[].lock  : الهوية القانونية لهذا العنصر (إن وُجدت) — تُشترط على الجديد
     prim         : حقولٌ قوائمُها قيمٌ بدائية (نصوص) — الظهور إضافة والزوال حذف
     primRoot     : الجذر نفسه قائمةُ قيمٍ بدائية
     primAct      : الفعل الذي تسمّيه الواجهة لتغيير هذه القائمة (حين تسمّيه واحداً)
     append       : مجموعاتٌ إلحاقية لا تُمسّ سوابقها
     rename       : عملية إعادة تسميةٍ مجالية وتبعاتها داخل المورد نفسه
     adopt        : تبنّي هويةٍ قانونية لسجلٍّ قديم، ومعه الحقول المهجورة
     empty        : الشكل الفارغ القانوني عند أول إنشاء */
var ENT = {
  /* ── موظفو الإدارة ── */
  /* Employees.loadEmp: يمنح eid لكل سجلٍّ قديمٍ بلا eid ويُسقط الحقل المهجور job */
  'bassam_employees_v1':      { cols: [{ at: '', idf: ['eid', 'nid', 'name'], lock: ['eid'] }], empty: '[]',
                                adopt: { at: '', drop: ['job'] } },
  /* loadOptions: { type:[نصوص], work:[نصوص] } */
  'bassam_options_v1':        { empty: '{}', prim: ['type', 'work'] },
@@SYS:ent.custody@@@@SYS:ent.reg@@  /* ── الإعدادات ── */
  /* sfRead: [{ name, color, tStart, tEnd }] — الاسم هويةٌ، وإعادة تسميته عملية edit */
  'bassam_shift_options_v1':  { cols: [{ at: '', idf: ['name'], lock: ['name'] }], empty: '[]',
                                rename: { at: '', field: 'name' } },
  'bassam_perm_tpls_v1':      { cols: [{ at: '', idf: ['id'], lock: ['id'] }], empty: '[]' },
  /* رايةُ ترحيلٍ تُكتب مرةً واحدة — بلا شكلٍ مفروض */
  'bassam_perm_tpls_named_v1':{ },
@@SYS:ent.reg.callsigns.staff@@@@SYS:ent.reg.leave.dreport@@@@SYS:ent.reg.staff@@@@SYS:ent.reg.tasks@@@@SYS:ent.reg.dreport@@  /* ── الجولات ── */
  'bassam_rounds_v1':         { map: 1, empty: '{}' },
  'bassam_dayshift_v1':       { map: 1, empty: '{}' },
  /* اليوم المختار: { y, m, d } */
  'bassam_dayfocus_v1':       { empty: '{}' },
@@SYS:ent.reg.plan@@  /* ── طوابع التصدير ── */
  'bassam_last_export_v1':    { empty: '0' },
  'bassam_last_full_export_v1': { empty: '0' }
};
function entOf(k) { return ENT[resName(k)] || null; }
