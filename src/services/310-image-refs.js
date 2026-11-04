
/* ═══ الجامعُ القانونيّ لمراجع الصور — المصدرُ الواحد لصيغة مفاتيح الصور الحيّة في المنصة كلِّها ═══
   العائلاتُ الثلاث: img_ (خرائطُ الخطة والجولات) · img_tsk (توثيقُ المهام — img_ نفسُها بادئةً) · szp_ (المضبوطات).
   التعبيرُ هو عينُ تعبير الخادم imgIdsIn حرفاً بحرف. كلُّ من يجمع صوراً (تصديرُ الإدارة، النسخةُ الشاملة، مسحُ الإدارة،
   كنسُ اليتيمات) يمرّ من هنا — لا تعابيرَ محلّيةً ناقصةً تختلف دلالتُها من موضعٍ لآخر. */
(function(){
  var SRC = '(?:img|szp)_[a-z0-9]+_[a-z0-9]+';
  function idsIn(text){ var out = Object.create(null), m = String(text == null ? '' : text).match(new RegExp(SRC, 'g')); if (m) for (var i = 0; i < m.length; i++) out[m[i]] = 1; return out; }
  /* values: مصفوفةُ نصوصٍ أو كائنٌ {مفتاح: نصّ} → قائمةُ معرّفاتٍ بلا تكرار */
  function collect(values){
    var out = Object.create(null), list = Array.isArray(values) ? values : Object.keys(values || {}).map(function(k){ return values[k]; });
    for (var i = 0; i < list.length; i++) { var ids = idsIn(list[i]); for (var k in ids) out[k] = 1; }
    return Object.keys(out);
  }
  /* حوارُ التأكيد الموحَّد إن كان الجذرُ مركّباً، وإلا confirm() الأصليّ (شاشةُ الدخول) */
  KIVO.bsConfirm = function (o) { try { if (KIVO.BassamConfirm) return KIVO.BassamConfirm(o); } catch (e) {} return Promise.resolve(!!window.confirm(String((o && o.msg) || ''))); };
  KIVO.BassamImgRefs = { SRC: SRC, re: function(){ return new RegExp(SRC, 'g'); }, idsIn: function(t){ return Object.keys(idsIn(t)); }, collect: collect };
  /* الأشكالُ الفارغة القانونية لموارد الإدارة — مرآةُ جدول الخادم (RES.empty): الخادمُ لا يحذف مفاتيحَ الموارد (keydel)،
     فـ«مسحُ بياناتِ إدارة» = كتابةُ الشكل الفارغ لكلِّ مورد؛ وما ليس مورداً (تنبيهات، أوّلُ تشغيل…) يُحذف كمفتاح. */
  KIVO.__BS_RES_EMPTY = {
    bassam_employees_v1: '[]', bassam_options_v1: '{}', bassam_award_v1: '{"recs":[]}', bassam_award_docs_v1: '{}', bassam_award_docs_v2: '{}',
    bassam_irshad_v1: '{"reports":[]}', bassam_irshad_langs_v1: '[]', bassam_irshad_locs_v1: '[]',
    bassam_seized_v1: '{"reports":[]}', bassam_seized_cat_v1: '{"ver":1,"cats":[]}', bassam_seized_acts_v1: '[]', bassam_seized_locs_v1: '[]', bassam_seized_jew_v1: '[]',
    bassam_shift_options_v1: '[]', bassam_perm_tpls_v1: '[]', bassam_perm_tpls_named_v1: '{}', bassam_callsigns_v1: '[]', bassam_leave_kinds_v1: '[]', bassam_perm_limit_v1: '{}',
    bassam_staffing_v3: '{}', bassam_staffing_v2: '{}', bassam_staffing_snap_v1: '{}', bassam_staffing_locks_v1: '{}',
    bassam_tasks_v1: '{}', bassam_tasks_locks_v1: '{}', bassam_dreport_v1: '{}', bassam_dr_grp_v1: '{}', bassam_rounds_v1: '{}', bassam_dayshift_v1: '{}', bassam_dayfocus_v1: '{}',
    bassam_plan_v1: '{"zones":[],"gates":[],"marks":[],"paths":[],"floors":[],"months":{}}', bassam_zone_opts_v1: '{}', bassam_gate_opts_v1: '{}', bassam_mark_kinds_v1: '[]', bassam_last_export_v1: '0', bassam_last_full_export_v1: '0'
  };
})();
