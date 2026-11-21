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
@@SYS:res.reg.global@@  'bassam_notif_cfg_v1':       { scope: 'global', rule: 'super' },
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
  'bassam_employees_v1':       { scope: 'dept', cap: 'emps/data'@@SYS:res.emp.via.staff@@, self: 'email' },
  'bassam_options_v1':         { scope: 'dept', cap: 'emps/data' },
@@SYS:res.custody@@@@SYS:res.reg.staff@@@@SYS:res.reg.plan@@@@SYS:res.reg.daily@@  'bassam_dayshift_v1':        { scope: 'dept', cap: [@@SYS:res.dayCap.daily|empty="...[]"@@@@SYS:read.reader.dreport@@] },
  'bassam_dayfocus_v1':        { scope: 'dept', cap: [@@SYS:res.dayCap.daily|empty="...[]"@@@@SYS:read.reader.dreport@@] },
@@SYS:res.reg.dreport@@  /* ── المهام ── */
@@SYS:res.reg.tasks@@@@SYS:res.reg.dept@@  /* ── الإعدادات: أوراقها لا صفحتها الأم ── */
  'bassam_shift_options_v1':   { scope: 'dept', cap: 'admin/shifts' },
  'bassam_perm_tpls_v1':       { scope: 'dept', cap: 'admin/ptpls'@@SYS:res.via.ptpls.dreport@@ },
  'bassam_perm_tpls_named_v1': { scope: 'dept', cap: 'admin/ptpls' },
  'bassam_last_export_v1':     { scope: 'dept', cap: 'admin/backup' },
  /* طابعُ النسخة الشاملة (كلُّ الإدارات): سجلُّ منصّةٍ عامٌّ يكتبه مديرُ النظام وحده — لا بياناتُ إدارة.
     كان scope:'dept' فيُرفض مفتاحُه العامُّ (why=super) ويضيع الطابع عند التحديث. */
  'bassam_last_full_export_v1':{ scope: 'global', rule: 'super' },
  /* ── سياسات خاصة ── */
  'bassam_notif_v1':           { scope: 'dept', rule: 'notif' },
  'bassam_notif_dev_v1':       { scope: 'dept', rule: 'selfdev' },
  /* V7 · د5-هـ (44): أدوارُ الإدارة وأشخاصُها — يُقرأ داخل الإدارة (اسمُ الدور يُعرض للجميع) ويكتبه مديرُ الوحدة داخل سقفها أو مديرُ المنصة، مع منحه المترجَم
     في الحفظة نفسِها (057b perm44RolesWhy). p44 لا rule: لا ورقةَ تكتبه ولا صورةَ تُربط به (054 imgWriteOk · 060 enfImgWriteOk يرفضانها) */
  'bassam_roles_v1':           { scope: 'dept', p44: 1 },
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
/* V7 · د5-ح (13): موردٌ يُقرأ بسياسة موردٍ آخر حرفاً — أوراقُه وسقفُه ومفاتيحُ قراءته وإسقاطاتُه وخصوصيتُه (canRead · canRead0 · canReadEnf ·
   enfProjectStr · privOut) — يسجّله مالكُه (أرشيفُ الجولات بسياسة الجولات). ولا يكتبه العميلُ: srv في RES_REG (044 canWrite · 060 · 042 authorize0) —
   تكتبه خطوةُ خادمٍ وحدها، والاستعادةُ الخادمية المتحقَّقة (A.__srvRst) تعيده كما في النسخة. */
var RES_READ_AS = {
@@SYS:res.readAs@@};
function resReadAs(k) {
  var t = Object.prototype.hasOwnProperty.call(RES_READ_AS, resName(k)) ? RES_READ_AS[resName(k)] : null, P;
  if (!t) return k;
  P = parseKey(k);
  return P.dept ? 'bsdept:' + P.dept + ':' + t : k;
}
/* اسم المورد من المفتاح: bsdept:<d>:<name> ثم ما قبل أوّل نقطتين (notif_dev_v1:uid) */
function resName(k) { return String(parseKey(k).name).replace(/:.*$/, ''); }
function resOf(k) { return RES_REG[resName(k)] || null; }


