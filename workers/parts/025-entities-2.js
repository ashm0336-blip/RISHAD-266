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
  /* العهد: items هويتها الاسم — لا id تكتبه الواجهة — وmoves إلحاقية بلا معرّف */
  'bassam_custody_v1':        { cols: [{ at: 'items', idf: ['name'], lock: ['name'] }, { at: 'moves', idf: [] }],
                                empty: '{"items":[],"moves":[]}', append: ['moves'],
                                rename: { at: 'items', field: 'name', cascade: [{ at: 'moves', field: 'item' }] } },
  /* ── جائزة التميز ── */
  'bassam_award_v1':          { cols: [{ at: 'recs', idf: ['id', 'name'], lock: ['id'] }], empty: '{"recs":[]}' },
  /* awDocs: جذرٌ كائنٌ بثلاثة مراجع A · B · C */
  'bassam_award_docs_v1':     { empty: '{}' },
  'bassam_award_docs_v2':     { empty: '{}' },
  /* ── الاسترشاد ── */
  'bassam_irshad_v1':         { cols: [{ at: 'reports', idf: ['id'], lock: ['id'] }], empty: '{"reports":[]}' },
  'bassam_irshad_langs_v1':   { empty: '[]', primRoot: 1 },
  'bassam_irshad_locs_v1':    { empty: '[]', primRoot: 1 },
  /* ── المضبوطات ── */
  'bassam_seized_v1':         { cols: [{ at: 'reports', idf: ['id'], lock: ['id'] }], empty: '{"reports":[]}' },
  /* loadCat: { ver, cats:[{ name, items:[…] }] } */
  'bassam_seized_cat_v1':     { cols: [{ at: 'cats', idf: ['id', 'name'] }], empty: '{"ver":1,"cats":[]}' },
  'bassam_seized_acts_v1':    { cols: [{ at: '', idf: ['id', 'name'] }], empty: '[]' },
  'bassam_seized_locs_v1':    { empty: '[]', primRoot: 1 },
  'bassam_seized_jew_v1':     { empty: '[]', primRoot: 1 },
  /* ── الإعدادات ── */
  /* sfRead: [{ name, color, tStart, tEnd }] — الاسم هويةٌ، وإعادة تسميته عملية edit */
  'bassam_shift_options_v1':  { cols: [{ at: '', idf: ['name'], lock: ['name'] }], empty: '[]',
                                rename: { at: '', field: 'name' } },
  'bassam_perm_tpls_v1':      { cols: [{ at: '', idf: ['id'], lock: ['id'] }], empty: '[]' },
  /* رايةُ ترحيلٍ تُكتب مرةً واحدة — بلا شكلٍ مفروض */
  'bassam_perm_tpls_named_v1':{ },
  'bassam_callsigns_v1':      { empty: '[]', primRoot: 1 },
  /* drAddLeaveKind/drDelLeaveKind: كلتاهما محروستان بـPC("edit") في الواجهة */
  'bassam_leave_kinds_v1':    { empty: '[]', primRoot: 1, primAct: 'edit' },
  /* ── الجدول الشهري ── */
  'bassam_staffing_v3':       { map: 1, sub: 'map', empty: '{}' },
  'bassam_staffing_v2':       { map: 1, sub: 'map', empty: '{}' },
  'bassam_staffing_snap_v1':  { map: 1, empty: '{}' },
  'bassam_staffing_locks_v1': { map: 1, empty: '{}' },
  /* ── المهام ── */
  'bassam_tasks_v1':          { map: 1, sub: 'list', empty: '{}' },
  'bassam_tasks_locks_v1':    { map: 1, empty: '{}' },
  /* ── التقرير اليومي ── */
  'bassam_dreport_v1':        { map: 1, empty: '{}' },
  /* drGrpPref: { on:true, closed:{…} } */
  'bassam_dr_grp_v1':         { empty: '{}' },
  /* ── الجولات ── */
  'bassam_rounds_v1':         { map: 1, empty: '{}' },
  'bassam_dayshift_v1':       { map: 1, empty: '{}' },
  /* اليوم المختار: { y, m, d } */
  'bassam_dayfocus_v1':       { empty: '{}' },
  /* ── الخطة التشغيلية ── */
  'bassam_plan_v1':           { cols: [{ at: 'gates', idf: ['id', 'num'] }, { at: 'zones', idf: ['id', 'name'] }, { at: 'marks', idf: ['id', 'name'] }, { at: 'floors', idf: ['id', 'n'] }], mapAt: 'months', empty: '{}' },
  /* loadZoneOpts / loadGateOpts: كائنٌ فيه قوائمُ خياراتٍ بدائية */
  'bassam_zone_opts_v1':      { empty: '{}' },
  'bassam_gate_opts_v1':      { empty: '{}', prim: ['loc', 'gtype', 'kind', 'route', 'cls', 'cat'] },
  'bassam_mark_kinds_v1':     { empty: '[]', primRoot: 1 },
  /* ── طوابع التصدير ── */
  'bassam_last_export_v1':    { empty: '0' },
  'bassam_last_full_export_v1': { empty: '0' }
};
function entOf(k) { return ENT[resName(k)] || null; }
