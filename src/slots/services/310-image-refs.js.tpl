
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
    bassam_employees_v1: '[]', bassam_options_v1: '{}',@@SYS:res.empty.award@@
@@SYS:res.empty.systems@@    bassam_shift_options_v1: '[]', bassam_perm_tpls_v1: '[]', bassam_perm_tpls_named_v1: '{}',@@SYS:res.empty.staff.callsigns@@@@SYS:imgref.empty.dreport.lk@@@@SYS:res.empty.staff@@
    @@SYS:res.empty.tasks@@@@SYS:imgref.empty.dreport@@bassam_rounds_v1: '{}', bassam_dayshift_v1: '{}', bassam_dayfocus_v1: '{}',
    @@SYS:imgref.empty.plan@@bassam_last_export_v1: '0', bassam_last_full_export_v1: '0'
  };
})();
