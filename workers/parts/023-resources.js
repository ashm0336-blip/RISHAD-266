/* ══ سجل الموارد: لكل مفتاح تخزينٍ معروف سياسةٌ صريحة ══════════════════════
   scope: global (سجل منصّة) · dept (بيانات إدارة) · device (تفضيل جهاز لا يُخزَّن)
   cap  : الورقة القانونية بالضبط — لا صفحتها الأم. مصفوفةٌ إن كان المورد
          مشتركاً بين ورقتين فعلاً (ترجمةٌ أمينة لسلوك BASELINE لا توسيعٌ له).
   rule : سياسةٌ خاصة تسبق الأوراق (users · perms · notif · flag · self · tech)
   via  : منحٌ محدودٌ بالحقول من ورقةٍ أخرى — لا يتحوّل إلى كتابة المورد كاملاً
   ولا يوجد «افتراضي»: ما ليس هنا يُرفض. */
var RES_REG = {
  /* ── سجلات المنصة العامة ── */
  'bassam_auth_users_v1':      { scope: 'global', rule: 'users' },
  'bassam_perms_v1':           { scope: 'global', rule: 'perms' },
  'bassam_depts_v1':           { scope: 'global', rule: 'super' },
  'bassam_gdepts_v1':          { scope: 'global', rule: 'super' },
  'bassam_platform_v1':        { scope: 'global', rule: 'super' },
  /* R170: إحصائياتُ الحرمين اليومية — وثيقةٌ واحدةٌ لكلِّ موقعٍ في كلِّ يوم.
     R180: سياستُها أوراقُ المسجدين (dstatsRule) — لا مديرُ النظام وحده */
  'bassam_dstats_v1':          { scope: 'global', rule: 'dstats' },
  'bassam_notif_cfg_v1':       { scope: 'global', rule: 'super' },
  'bassam_notif_sys_v1':       { scope: 'global', rule: 'super' },
  'bassam_bc_v1':              { scope: 'global', rule: 'super' },
  'bassam_struct_seed_v1':     { scope: 'global', rule: 'super' },
  'bassam_perm_admsubs_v2':    { scope: 'global', rule: 'super' },
  /* ── تفضيلات جهازٍ لا فريق: تُرفض حفظاً ولا تُخزَّن مركزياً ── */
  'bassam_session_v1':         { scope: 'device' },
  'bslg_v1':                   { scope: 'device' },
  'bassam_theme':              { scope: 'device' },
  'bassam_active_dept_v1':     { scope: 'device' },
  'bassam_fresh_login_v1':     { scope: 'device' },
  'bassam_notif_mute_v1':      { scope: 'device' },
  'bassam_page_v1':            { scope: 'device' },
  /* R187: «مجموعات | قائمة» في الجدول الشهري — تفضيلُ عرضٍ لهذا الجهاز (لكل إدارة) */
  'bassam_st_grp_v1':          { scope: 'device' },
  /* ── موظفو الإدارة ── */
  'bassam_employees_v1':       { scope: 'dept', cap: 'emps/data', via: { staff: 'EMP_FIELDS' }, self: 'email' },
  'bassam_options_v1':         { scope: 'dept', cap: 'emps/data' },
  'bassam_custody_v1':         { scope: 'dept', cap: 'emps/custody' },
  /* ── الجدول الشهري ── */
  'bassam_staffing_v3':        { scope: 'dept', cap: 'staff', via: { dreport: 'CS_ONLY' } },
  'bassam_staffing_v2':        { scope: 'dept', cap: 'staff' },
  'bassam_staffing_snap_v1':   { scope: 'dept', cap: 'staff', via: { dreport: 'SNAP_CS_ONLY' } },
  'bassam_staffing_locks_v1':  { scope: 'dept', cap: 'staff' },
  'bassam_callsigns_v1':       { scope: 'dept', cap: 'staff' },
  'bassam_perm_limit_v1':      { scope: 'dept', cap: ['staff', 'dreport'] },
  /* ── التشغيل الميداني ── */
  'bassam_plan_v1':            { scope: 'dept', cap: 'plan', via: { 'emps/data': 'EMP_REFS' } },
  'bassam_zone_opts_v1':       { scope: 'dept', cap: 'plan' },
  'bassam_gate_opts_v1':       { scope: 'dept', cap: 'plan' },
  'bassam_mark_kinds_v1':      { scope: 'dept', cap: 'plan' },
  /* ── المتابعة اليومية ── */
  /* اعتماد الجولة عمليةُ setShiftAp: أعلامُ الاعتماد وبياناتها التابعة وحدها.
     أمّا closed · cWhy · needN · off · dopen فرصدٌ تشغيليّ لا اعتماد. */
  'bassam_rounds_v1':          { scope: 'dept', cap: 'daily/rounds', via: { dreport: 'NO_APPROVAL', 'emps/data': 'EMP_REFS' }, field: 'daily' },
  'bassam_dayshift_v1':        { scope: 'dept', cap: ['daily/rounds', 'dreport'] },
  'bassam_dayfocus_v1':        { scope: 'dept', cap: ['daily/rounds', 'dreport'] },
  /* ── التقرير اليومي ── */
  'bassam_dreport_v1':         { scope: 'dept', cap: 'dreport' },
  'bassam_dr_grp_v1':          { scope: 'dept', cap: 'dreport' },
  'bassam_leave_kinds_v1':     { scope: 'dept', cap: 'dreport' },
  /* ── المهام ── */
  /* المهام: يومٌ ثم صفوفُ مهامّه — فالكيان في الطبقة الثانية */
  'bassam_tasks_v1':           { scope: 'dept', cap: 'tasks', self: 'task' },
  'bassam_tasks_locks_v1':     { scope: 'dept', cap: 'tasks' },
  /* ── الاسترشاد ── */
  'bassam_irshad_v1':          { scope: 'dept', cap: 'irshad/records' },
  'bassam_irshad_langs_v1':    { scope: 'dept', cap: 'irshad/records' },
  'bassam_irshad_locs_v1':     { scope: 'dept', cap: 'irshad/records' },
  /* ── المضبوطات ── */
  'bassam_seized_v1':          { scope: 'dept', cap: 'seized/records' },
  'bassam_seized_cat_v1':      { scope: 'dept', cap: 'seized/records' },
  'bassam_seized_acts_v1':     { scope: 'dept', cap: 'seized/records' },
  'bassam_seized_locs_v1':     { scope: 'dept', cap: 'seized/records' },
  'bassam_seized_jew_v1':      { scope: 'dept', cap: 'seized/records' },
  /* ── جائزة التميز ── */
  /* الترشيح يُنشأ من award/new، وكل ما عداه — تعديلٌ أو حذفٌ أو اعتماد نتيجة — لا يكون إلا بورقة award/res */
  'bassam_award_v1':           { scope: 'dept', cap: 'award/res', capAdd: 'award/new' },
  'bassam_award_docs_v1':      { scope: 'dept', cap: 'award/doc' },
  'bassam_award_docs_v2':      { scope: 'dept', cap: 'award/doc' },
  /* ── الإعدادات: أوراقها لا صفحتها الأم ── */
  'bassam_shift_options_v1':   { scope: 'dept', cap: 'admin/shifts' },
  'bassam_perm_tpls_v1':       { scope: 'dept', cap: 'admin/ptpls', via: { dreport: 'SEED_ONLY' } },
  'bassam_perm_tpls_named_v1': { scope: 'dept', cap: 'admin/ptpls' },
  'bassam_last_export_v1':     { scope: 'dept', cap: 'admin/backup' },
  /* طابعُ النسخة الشاملة (كلُّ الإدارات): سجلُّ منصّةٍ عامٌّ يكتبه مديرُ النظام وحده — لا بياناتُ إدارة.
     كان scope:'dept' فيُرفض مفتاحُه العامُّ (why=super) ويضيع الطابع عند التحديث. */
  'bassam_last_full_export_v1':{ scope: 'global', rule: 'super' },
  /* ── سياسات خاصة ── */
  'bassam_notif_v1':           { scope: 'dept', rule: 'notif' },
  'bassam_notif_dev_v1':       { scope: 'dept', rule: 'selfdev' },
  /* راياتُ ترحيلٍ عامّة لمرّةٍ واحدة — لا بياناتُ إدارة. كلٌّ منها يرحّل السجل
     العام bassam_perms_v1 مارّاً على الإدارات كلها، وتُكتب بلا نطاقٍ بنفس
     اصطلاح struct_seed و perm_admsubs_v2 — فعقدُها عقدُهما حرفاً بحرف. */
  'bassam_perm_help_v1':       { scope: 'global', rule: 'super' },
  'bassam_perm_irshad_cap_v1': { scope: 'global', rule: 'super' },
  'bassam_perm_seized_cap_v1': { scope: 'global', rule: 'super' },
  'bassam_perm_leaf_v1':       { scope: 'global', rule: 'super' },
  'bassam_perm_mgr_explicit_v1': { scope: 'global', rule: 'super' },
  /* ── رايات تقنية تكتبها الواجهة مرّةً عند التهيئة: سياسةٌ مسجَّلة صراحةً
        (لا «افتراضي مفتوح») — تُكتب ممّن له كتابةٌ في الإدارة، وهي بلا محتوى
        يُقرأ. أُبقيت على سلوك BASELINE عمداً لئلا تتكرّر رسائل رفضٍ بلا فائدة. ── */
  'bassam_first_boot_v1':      { scope: 'dept', rule: 'tech' },
  'bassam_demo_purged_v1':     { scope: 'dept', rule: 'tech' },
  'bassam_profile_v1':         { scope: 'dept', rule: 'tech' }
};
/* اسم المورد من المفتاح: bsdept:<d>:<name> ثم ما قبل أوّل نقطتين (notif_dev_v1:uid) */
function resName(k) { return String(parseKey(k).name).replace(/:.*$/, ''); }
function resOf(k) { return RES_REG[resName(k)] || null; }


