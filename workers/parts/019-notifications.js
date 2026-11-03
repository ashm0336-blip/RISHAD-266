/* Typed notification domain. The static type defaults are mirrored from 441 REG;
   parity is tested. No notification business document is stored in KV. */
function notifRule() {
  return { ok: false, why: "domain-moved" };
}
var NF_TYPES = {
  emp_add: {
    id: "emp_add",
    k: "emp",
    name: "إضافة موظف جديد",
    when: "فور الإضافة",
    on: true,
    to: ["mgr"],
    lvl: "info",
    chan: "bell",
    txt: "أُضيف {الاسم} ({النوع}) إلى موظفي الإدارة",
    go: "افتح الموظفين",
  },
  emp_edit: {
    id: "emp_edit",
    k: "emp",
    name: "تعديل بيانات موظف",
    when: "فور الحفظ",
    on: true,
    to: ["own", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "عُدّلت بياناتك: {الحقول} — بواسطة {المُعدّل}",
    go: "",
  },
  emp_type: {
    id: "emp_type",
    k: "emp",
    name: "تغيير نوع التوظيف",
    when: "فور الحفظ",
    on: true,
    to: ["own", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "تغيّر {الحقل} إلى «{القيمة}»",
    go: "",
  },
  emp_del: {
    id: "emp_del",
    k: "emp",
    name: "حذف موظف",
    when: "فور الحذف",
    on: true,
    to: ["mgr", "sys"],
    lvl: "act",
    chan: "bell",
    txt: "حُذف {الاسم} من الإدارة بواسطة {المُعدّل}",
    go: "افتح سجل الحركة",
  },
  emp_gap: {
    id: "emp_gap",
    k: "emp",
    name: "بيانات ناقصة تمنع تفعيل الحساب",
    when: "عند اكتشافها",
    on: false,
    to: ["mgr"],
    lvl: "info",
    chan: "bell",
    txt: "{العدد} موظفاً بلا {الحقل} — يتعذّر تفعيل حساباتهم",
    go: "افتح الموظفين",
  },
  emp_imp: {
    id: "emp_imp",
    k: "emp",
    name: "استيراد موظفين من ملف Excel",
    when: "فور الاستيراد",
    on: true,
    to: ["mgr", "sys"],
    lvl: "info",
    chan: "bell",
    txt: "استُورد {المضافون} موظفاً جديداً وحُدّث {المحدثون} — بواسطة {المُعدّل}",
    go: "افتح الموظفين",
  },
  emp_wipe: {
    id: "emp_wipe",
    k: "emp",
    name: "حذف جميع الموظفين (تصفير شامل)",
    when: "فور التنفيذ",
    on: true,
    to: ["sys"],
    lvl: "urg",
    chan: "toast",
    txt: "حُذف كل موظفي إدارة {الإدارة} ونُظّفت بياناتها — بواسطة {المُعدّل}",
    go: "افتح سجل الحركة",
  },
  acct_on: {
    id: "acct_on",
    k: "acct",
    name: "تفعيل حساب دخولك",
    when: "فور التفعيل",
    on: true,
    to: ["own"],
    lvl: "info",
    chan: "toast",
    txt: "فُعّل حساب دخولك — اسم المستخدم {المستخدم}",
    go: "",
  },
  acct_frz: {
    id: "acct_frz",
    k: "acct",
    name: "تجميد حساب / إعادة تفعيله",
    when: "فور التغيير",
    on: true,
    to: ["mgr", "sys"],
    lvl: "act",
    chan: "bell",
    txt: "{الحالة} حساب {الاسم} بواسطة {المُعدّل}",
    go: "افتح الموظفين",
  },
  acct_pw: {
    id: "acct_pw",
    k: "acct",
    name: "إعادة تعيين كلمة المرور",
    when: "فور التعيين",
    on: true,
    to: ["own", "sys"],
    lvl: "act",
    chan: "bell",
    txt: "أُعيد تعيين كلمة مرورك بواسطة {المُعدّل} — غيّرها عند أول دخول",
    go: "",
  },
  acct_mgr: {
    id: "acct_mgr",
    k: "acct",
    name: "تعيين مدير إدارة أو إلغاؤه",
    when: "فور التغيير",
    on: true,
    to: ["own", "sys"],
    lvl: "act",
    chan: "toast",
    txt: "{الفعل} مديراً لإدارة {الإدارة}",
    go: "",
  },
  acct_bulk: {
    id: "acct_bulk",
    k: "acct",
    name: "تجميد أو تفعيل جماعي للحسابات",
    when: "فور التنفيذ",
    on: true,
    to: ["mgr", "sys"],
    lvl: "act",
    chan: "bell",
    txt: "{الفعل} {العدد} حساباً دفعة واحدة — بواسطة {المُعدّل}",
    go: "افتح الموظفين",
  },
  acct_tpl: {
    id: "acct_tpl",
    k: "acct",
    name: "منح قالب صلاحيات لموظف",
    when: "فور المنح",
    on: true,
    to: ["own"],
    lvl: "info",
    chan: "bell",
    txt: "مُنحت قالب «{القالب}» — {العدد} صفحات",
    go: "",
  },
  task_new: {
    id: "task_new",
    k: "task",
    name: "مهمة أُسندت إليك",
    when: "فور الإسناد",
    on: true,
    to: ["own"],
    lvl: "act",
    chan: "toast",
    txt: "أُسندت إليك «{المهمة}» — حتى {الوقت}",
    go: "افتح المهمة",
  },
  task_soon: {
    id: "task_soon",
    k: "task",
    name: "موعد المهمة يقترب",
    when: "قبل الموعد بساعة",
    on: true,
    to: ["own"],
    lvl: "act",
    chan: "toast",
    txt: "بقي {المدة} على «{المهمة}»",
    go: "افتح المهمة",
  },
  task_late: {
    id: "task_late",
    k: "task",
    name: "مهمة متأخرة",
    when: "عند تجاوز الموعد",
    on: true,
    to: ["own", "lead", "mgr"],
    lvl: "urg",
    chan: "toast",
    txt: "تأخّرت «{المهمة}» المسندة إلى {الاسم} عن موعدها {الوقت}",
    go: "افتح المهام",
  },
  task_done: {
    id: "task_done",
    k: "task",
    name: "إنجاز مهمة",
    when: "فور الإنجاز",
    on: true,
    to: ["mgr"],
    lvl: "info",
    chan: "bell",
    txt: "أنجز {الاسم} «{المهمة}»",
    go: "افتح المهام",
  },
  task_chg: {
    id: "task_chg",
    k: "task",
    name: "تعديل مهمة أو إلغاؤها أو إعادة إسنادها",
    when: "فور التغيير",
    on: true,
    to: ["own"],
    lvl: "act",
    chan: "bell",
    txt: "{الفعل} مهمة «{المهمة}» — {التفصيل}",
    go: "افتح المهمة",
  },
  cu_out: {
    id: "cu_out",
    k: "cust",
    name: "تسليم عهدة",
    when: "فور التسليم",
    on: true,
    to: ["own"],
    lvl: "info",
    chan: "bell",
    txt: "سُلّمت لك عهدة «{العهدة}» ({الرقم}) — بتاريخ {التاريخ}",
    go: "افتح العهد",
  },
  cu_in: {
    id: "cu_in",
    k: "cust",
    name: "استرجاع عهدة",
    when: "فور الاسترجاع",
    on: true,
    to: ["own", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "استُرجعت عهدة «{العهدة}» من {الاسم}",
    go: "",
  },
  cu_late: {
    id: "cu_late",
    k: "cust",
    name: "عهدة متأخرة الإرجاع",
    when: "عند تجاوز الموعد",
    on: true,
    to: ["own", "mgr"],
    lvl: "act",
    chan: "bell",
    txt: "عهدة «{العهدة}» لدى {الاسم} تجاوزت موعد إرجاعها {التاريخ}",
    go: "افتح العهد",
  },
  cu_lost: {
    id: "cu_lost",
    k: "cust",
    name: "عهدة تالفة أو مفقودة",
    when: "فور التسجيل",
    on: true,
    to: ["mgr", "sys"],
    lvl: "urg",
    chan: "toast",
    txt: "سُجّلت عهدة «{العهدة}» {الحالة} — {الاسم}",
    go: "افتح العهد",
  },
  cu_bond: {
    id: "cu_bond",
    k: "cust",
    name: "اعتماد سند تسليم / استلام",
    when: "فور الاعتماد",
    on: true,
    to: ["own", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "اعتُمد سند {النوع} رقم {الرقم} — {العدد} أصناف",
    go: "افتح السند",
  },
  cu_stock: {
    id: "cu_stock",
    k: "cust",
    name: "نفاد صنف من المستودع",
    when: "عند آخر قطعة",
    on: true,
    to: ["mgr"],
    lvl: "act",
    chan: "bell",
    txt: "لم يبقَ من «{الصنف}» قطع متاحة في المستودع",
    go: "افتح المستودع",
  },
  st_shift: {
    id: "st_shift",
    k: "staff",
    name: "تغيير وردية موظف في الجدول",
    when: "فور الحفظ",
    on: true,
    to: ["lead", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "تغيّرت وردية {الاسم} في {الشهر} من {القديم} إلى {الجديد} — بواسطة {المُعدّل}",
    go: "افتح الجدول الشهري",
  },
  st_rest: {
    id: "st_rest",
    k: "staff",
    name: "تغيير أيام راحة موظف في الجدول",
    when: "فور الحفظ",
    on: true,
    to: ["lead", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "أيام راحة {الاسم} في {الشهر} صارت: {الأيام} — بواسطة {المُعدّل}",
    go: "افتح الجدول الشهري",
  },
  st_loc: {
    id: "st_loc",
    k: "staff",
    name: "تغيير موقع موظف في الجدول",
    when: "فور الحفظ",
    on: true,
    to: ["lead", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "موقع {الاسم} في {اليوم} صار «{الموقع}» بدل «{القديم}»",
    go: "افتح الجدول الشهري",
  },
  st_leave: {
    id: "st_leave",
    k: "staff",
    name: "تسجيل استئذان أو إجازة في الجدول",
    when: "فور التسجيل",
    on: true,
    to: ["lead", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "سُجّل لـ{الاسم} {النوع} يوم {اليوم} بواسطة {المُعدّل}",
    go: "افتح الجدول الشهري",
  },
  st_lead: {
    id: "st_lead",
    k: "staff",
    name: "تعيين رئيس أو نائب في الجدول",
    when: "فور التعيين",
    on: true,
    to: ["lead", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "عُيّن {الاسم} {الدور} لـ{الوردية} في {الشهر}",
    go: "افتح الجدول الشهري",
  },
  st_pub: {
    id: "st_pub",
    k: "staff",
    name: "نشر جدول شهر جديد",
    when: "فور النشر",
    on: true,
    to: ["lead", "mgr"],
    lvl: "info",
    chan: "toast",
    txt: "نُشر جدول {الشهر} — {العدد} موظفاً موزَّعين",
    go: "افتح الجدول الشهري",
  },
  st_lock: {
    id: "st_lock",
    k: "staff",
    name: "اعتماد الشهر وقفله / فك الاعتماد",
    when: "فور التغيير",
    on: true,
    to: ["lead", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "{الفعل} جدول {الشهر} بواسطة {المُعدّل}",
    go: "",
  },
  st_gap: {
    id: "st_gap",
    k: "staff",
    name: "نقص في تسكين وردية الغد",
    when: "الساعة 16:00 يومياً",
    on: true,
    to: ["lead", "mgr"],
    lvl: "act",
    chan: "toast",
    txt: "الوردية {الوردية} غداً ينقصها {العدد} على المواقع الحرجة",
    go: "افتح الجدول الشهري",
  },
  st_dup: {
    id: "st_dup",
    k: "staff",
    name: "تعارض تسكين (موظف في موقعين)",
    when: "عند الحفظ",
    on: true,
    to: ["mgr"],
    lvl: "urg",
    chan: "toast",
    txt: "{الاسم} مسكّن في «{الموقع1}» و«{الموقع2}» يوم {اليوم}",
    go: "افتح الجدول الشهري",
  },
  st_rest2: {
    id: "st_rest2",
    k: "staff",
    name: "تجاوز حدّ الراحات الأسبوعي",
    when: "عند المحاولة",
    on: false,
    to: ["lead", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "محاولة منح راحة ثالثة في أسبوع لـ{الاسم} — رُفضت",
    go: "",
  },
  st_shdef: {
    id: "st_shdef",
    k: "staff",
    name: "تعريف وردية أُضيف أو عُدّل أو حُذف",
    when: "فور الحفظ",
    on: true,
    to: ["lead", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "{الفعل} وردية «{الوردية}» — {التفصيل} · بواسطة {المُعدّل}",
    go: "افتح الإعدادات",
  },
  pl_chg: {
    id: "pl_chg",
    k: "plan",
    name: "تعديل الخطة الميدانية لموقع",
    when: "فور الحفظ",
    on: true,
    to: ["lead", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "عُدّلت خطة «{الموقع}»: {التفصيل}",
    go: "افتح التشغيل الميداني",
  },
  pl_cap: {
    id: "pl_cap",
    k: "plan",
    name: "تغيير سعة موقع أو إغلاقه",
    when: "فور الحفظ",
    on: true,
    to: ["lead", "mgr"],
    lvl: "act",
    chan: "toast",
    txt: "{الموقع}: {التفصيل} بواسطة {المُعدّل}",
    go: "افتح التشغيل الميداني",
  },
  pl_mark: {
    id: "pl_mark",
    k: "plan",
    name: "علامة أو مسار جديد",
    when: "فور الإضافة",
    on: false,
    to: ["lead"],
    lvl: "info",
    chan: "bell",
    txt: "أُضيف {النوع} «{الاسم}» في {الموقع}",
    go: "",
  },
  pl_ok: {
    id: "pl_ok",
    k: "plan",
    name: "اعتماد الخطة الميدانية للشهر",
    when: "فور الاعتماد",
    on: true,
    to: ["lead", "mgr"],
    lvl: "info",
    chan: "toast",
    txt: "اعتُمدت خطة {الشهر} وأُنشئت أول جولة — {العدد} موقعاً",
    go: "افتح الجولات",
  },
  pl_place: {
    id: "pl_place",
    k: "plan",
    name: "تسكينك على موقع في التشغيل الميداني",
    when: "فور التسكين",
    on: true,
    to: ["own", "lead"],
    lvl: "act",
    chan: "toast",
    txt: "سُكِّنت على «{إلى}» في التشغيل الميداني — {الوقت} · {المُعدّل}",
    go: "افتح صفحتي",
  },
  pl_move: {
    id: "pl_move",
    k: "plan",
    name: "نقلك إلى موقع آخر على الخريطة",
    when: "فور النقل",
    on: true,
    to: ["own", "lead"],
    lvl: "act",
    chan: "toast",
    txt: "نُقلت من «{من}» إلى «{إلى}» — {الوقت} · {المُعدّل}",
    go: "افتح صفحتي",
  },
  pl_unplace: {
    id: "pl_unplace",
    k: "plan",
    name: "رفع تسكينك من موقع",
    when: "فور الرفع",
    on: true,
    to: ["own", "lead"],
    lvl: "info",
    chan: "bell",
    txt: "رُفع تسكينك من «{من}» في التشغيل الميداني — {الوقت} · {المُعدّل}",
    go: "افتح صفحتي",
  },
  pl_sup: {
    id: "pl_sup",
    k: "plan",
    name: "رفع موظف إلى إشرافي / إعادته",
    when: "فور التغيير",
    on: true,
    to: ["own", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "{الفعل}: {الاسم} — لا يُحسب في التغطية",
    go: "",
  },
  rd_low: {
    id: "rd_low",
    k: "ready",
    name: "انخفاض الجاهزية تحت الحد",
    when: "عند الحساب اليومي",
    on: true,
    to: ["mgr"],
    lvl: "act",
    chan: "bell",
    txt: "جاهزية {الشهر} {النسبة}٪ — تحت الحد {الحد}٪ ({السبب})",
    go: "افتح مؤشرات الجاهزية",
  },
  rep_pull: {
    id: "rep_pull",
    k: "rep",
    name: "سحب تقرير الوردية",
    when: "فور السحب",
    on: true,
    to: ["lead", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "سُحب تقرير {الوردية} ليوم {اليوم} بواسطة {المُعدّل}",
    go: "افتح التقرير",
  },
  rep_late: {
    id: "rep_late",
    k: "rep",
    name: "تقرير مسحوب لم يُعتمد",
    when: "قبل انتهاء الوردية بساعة",
    on: true,
    to: ["lead", "mgr"],
    lvl: "urg",
    chan: "toast",
    txt: "تقرير {الوردية} لم يُعتمد — تنتهي الوردية {الوقت}",
    go: "افتح التقرير",
  },
  rep_ok: {
    id: "rep_ok",
    k: "rep",
    name: "اعتماد التقرير / فك الاعتماد",
    when: "فور التغيير",
    on: true,
    to: ["mgr"],
    lvl: "info",
    chan: "bell",
    txt: "{الفعل} تقرير {الوردية} · حضور {النسبة}٪",
    go: "افتح التقرير",
  },
  rep_att: {
    id: "rep_att",
    k: "rep",
    name: "تأشيرك في التقرير (غياب / تأخر / استئذان)",
    when: "فور التأشير",
    on: true,
    to: ["own"],
    lvl: "act",
    chan: "toast",
    txt: "أُشّر لك «{الحالة}» في تقرير {الوردية} {اليوم} — اعترض خلال 24 ساعة",
    go: "افتح التقرير",
  },
  rep_diff: {
    id: "rep_diff",
    k: "rep",
    name: "تغيّر الجدول بعد سحب التقرير",
    when: "عند الاكتشاف",
    on: true,
    to: ["lead", "mgr"],
    lvl: "act",
    chan: "bell",
    txt: "جدول {الوردية} تغيّر بعد سحب التقرير: {التفصيل}",
    go: "افتح التقرير",
  },
  rep_here: {
    id: "rep_here",
    k: "rep",
    name: "تسكينك اليوم في موقع مختلف",
    when: "عند السحب",
    on: true,
    to: ["own"],
    lvl: "act",
    chan: "toast",
    txt: "اليوم أنت في «{الموقع}» ({الوردية})",
    go: "افتح التقرير",
  },
  rep_mv: {
    id: "rep_mv",
    k: "rep",
    name: "تحويلك إلى وردية أو موقع آخر من التقرير",
    when: "فور التحويل",
    on: true,
    to: ["own", "lead"],
    lvl: "act",
    chan: "toast",
    txt: "حُوّلت إلى {الوردية} — «{الموقع}» بواسطة {المُعدّل}",
    go: "افتح التقرير",
  },
  rep_today: {
    id: "rep_today",
    k: "rep",
    name: "ورديتك اليوم (عند سحب التقرير)",
    when: "فور السحب",
    on: true,
    to: ["own"],
    lvl: "info",
    chan: "toast",
    txt: "ورديتك اليوم {الوردية} {الوقت} · القيادة: {القيادة}",
    go: "افتح صفحتي",
  },
  rep_restday: {
    id: "rep_restday",
    k: "rep",
    name: "اليوم راحتك (عند سحب التقرير)",
    when: "فور السحب",
    on: true,
    to: ["own"],
    lvl: "info",
    chan: "bell",
    txt: "اليوم {اليوم} راحتك — لست على وردية {الوردية}",
    go: "افتح صفحتي",
  },
  rep_rest: {
    id: "rep_rest",
    k: "rep",
    name: "تغيير أيام راحتك في التقرير",
    when: "فور التغيير",
    on: true,
    to: ["own", "lead"],
    lvl: "act",
    chan: "toast",
    txt: "أيام راحتك في تقرير {الوردية} صارت: {الأيام} — بواسطة {المُعدّل}",
    go: "افتح صفحتي",
  },
  rep_ap: {
    id: "rep_ap",
    k: "rep",
    name: "اعتماد تقرير ورديتك — حالتك",
    when: "فور الاعتماد",
    on: true,
    to: ["own"],
    lvl: "info",
    chan: "bell",
    txt: "اعتُمد تقرير {الوردية} ليوم {اليوم} — حالتك: {الحالة}",
    go: "افتح صفحتي",
  },
  rep_quota: {
    id: "rep_quota",
    k: "rep",
    name: "اكتمال نصاب استئذانات الشهر (من التقارير)",
    when: "عند التأشير",
    on: true,
    to: ["own", "lead", "mgr"],
    lvl: "act",
    chan: "bell",
    txt: "{الاسم} بلغ نصاب الاستئذان لشهر {الشهر} ({العدد} من {الحد})",
    go: "افتح التقرير",
  },
  rep_cont: {
    id: "rep_cont",
    k: "rep",
    name: "متابعة تقرير من يوم سابق",
    when: "فور المتابعة",
    on: false,
    to: ["mgr"],
    lvl: "info",
    chan: "bell",
    txt: "تقرير {الوردية} تُوبع من تقرير يوم {اليوم}",
    go: "افتح التقرير",
  },
  rep_lead: {
    id: "rep_lead",
    k: "rep",
    name: "تغيير قيادة الوردية في التقرير",
    when: "فور التغيير",
    on: true,
    to: ["own", "mgr"],
    lvl: "act",
    chan: "bell",
    txt: "{الدور} {الوردية} اليوم: {الاسم}",
    go: "افتح التقرير",
  },
  rn_start: {
    id: "rn_start",
    k: "round",
    name: "بدء جولة / إغلاقها",
    when: "فور التغيير",
    on: false,
    to: ["mgr"],
    lvl: "info",
    chan: "bell",
    txt: "{الفعل} جولة {الوردية} بواسطة {المُعدّل}",
    go: "افتح الجولات",
  },
  rn_red: {
    id: "rn_red",
    k: "round",
    name: "موقع بعجز كامل (أحمر)",
    when: "عند تأشير الجولة",
    on: true,
    to: ["lead", "mgr"],
    lvl: "urg",
    chan: "toast",
    txt: "«{الموقع}» بلا تغطية في جولة {الوقت}",
    go: "افتح الخريطة",
  },
  rn_full: {
    id: "rn_full",
    k: "round",
    name: "اكتمال تغطية كل المواقع",
    when: "عند التأشير",
    on: true,
    to: ["mgr"],
    lvl: "info",
    chan: "bell",
    txt: "اكتملت تغطية {العدد} موقعاً في جولة {الوقت}",
    go: "",
  },
  rn_loc: {
    id: "rn_loc",
    k: "round",
    name: "موقعك في جولة اليوم",
    when: "فور التسكين أو التغيير",
    on: true,
    to: ["own", "lead"],
    lvl: "act",
    chan: "toast",
    txt: "{الفعل} {الموقع} — جولة {اليوم}",
    go: "افتح صفحتي",
  },
  rn_close: {
    id: "rn_close",
    k: "round",
    name: "إغلاق موقعك في الجولة",
    when: "فور الإغلاق",
    on: true,
    to: ["own", "lead"],
    lvl: "act",
    chan: "toast",
    txt: "أُغلق موقعك «{الموقع}» في جولة {اليوم} — راجع رئيس الوردية لموقعك الجديد",
    go: "افتح صفحتي",
  },
  fd_obs: {
    id: "fd_obs",
    k: "round",
    name: "رصد ميداني: حالة موقع أو مساره",
    when: "فور الرصد",
    on: true,
    to: ["own", "lead", "mgr"],
    lvl: "act",
    chan: "toast",
    txt: "{الموظف} رصد {الباب}: {الحالة}{السبب} — {الوقت}",
    go: "افتح الجولات",
  },
  kp_att: {
    id: "kp_att",
    k: "kpi",
    name: "الحضور الفعلي تحت النسبة المحددة",
    when: "عند الاعتماد",
    on: true,
    to: ["mgr"],
    lvl: "act",
    chan: "bell",
    txt: "حضور {الوردية} {النسبة}٪ — تحت الحد {الحد}٪",
    go: "افتح المؤشرات",
  },
  kp_occ: {
    id: "kp_occ",
    k: "kpi",
    name: "إشغال مصلى تجاوز الحد",
    when: "عند التسجيل",
    on: true,
    to: ["lead", "mgr"],
    lvl: "urg",
    chan: "toast",
    txt: "إشغال «{المصلى}» {النسبة}٪",
    go: "افتح الإشغال",
  },
  ir_new: {
    id: "ir_new",
    k: "irshad",
    name: "محضر استرشاد جديد",
    when: "فور الحفظ",
    on: false,
    to: ["mgr"],
    lvl: "info",
    chan: "bell",
    txt: "محضر {الرقم}: {العدد} مستفيداً · {الموقع} · {الموظف}",
    go: "افتح السجلات",
  },
  ir_edit: {
    id: "ir_edit",
    k: "irshad",
    name: "تعديل أو حذف محضر",
    when: "فور التغيير",
    on: true,
    to: ["mgr"],
    lvl: "act",
    chan: "bell",
    txt: "{الفعل} محضر {الرقم} بواسطة {المُعدّل}",
    go: "افتح السجلات",
  },
  ir_day: {
    id: "ir_day",
    k: "irshad",
    name: "ملخص اليوم",
    when: "نهاية اليوم 23:30",
    on: true,
    to: ["mgr"],
    lvl: "info",
    chan: "bell",
    txt: "اليوم: {المحاضر} محضراً · {المستفيدون} مستفيداً · أعلى موقع {الموقع}",
    go: "افتح لوحة المؤشرات",
  },
  bx_new: {
    id: "bx_new",
    k: "box",
    name: "محضر مضبوطات جديد",
    when: "فور الحفظ",
    on: false,
    to: ["mgr"],
    lvl: "info",
    chan: "bell",
    txt: "محضر {الرقم}: {القطع} قطعة · {الموقع} · {الموظف}",
    go: "افتح السجلات",
  },
  bx_sec: {
    id: "bx_sec",
    k: "box",
    name: "محضر بإحالة أمنية",
    when: "فور الحفظ",
    on: true,
    to: ["mgr", "sys"],
    lvl: "urg",
    chan: "toast",
    txt: "محضر {الرقم}: {البند} أُحيل للجهة الأمنية من {الموظف}",
    go: "افتح المحضر",
  },
  bx_cash: {
    id: "bx_cash",
    k: "box",
    name: "مبلغ نقدي أو قيمة تتجاوز الحد",
    when: "فور الحفظ",
    on: true,
    to: ["mgr"],
    lvl: "act",
    chan: "toast",
    txt: "محضر {الرقم}: {المبلغ} ريال — يتجاوز حد {الحد}",
    go: "افتح المحضر",
  },
  bx_upd: {
    id: "bx_upd",
    k: "box",
    name: "تحديث إجراء بند",
    when: "فور التحديث",
    on: true,
    to: ["mgr"],
    lvl: "info",
    chan: "bell",
    txt: "محضر {الرقم}: {البند} {من} ← {إلى} بواسطة {المُعدّل}",
    go: "افتح المحضر",
  },
  bx_del: {
    id: "bx_del",
    k: "box",
    name: "حذف محضر",
    when: "فور الحذف",
    on: true,
    to: ["mgr", "sys"],
    lvl: "act",
    chan: "bell",
    txt: "حُذف محضر {الرقم} بواسطة {المُعدّل}",
    go: "افتح سجل الحركة",
  },
  bx_old: {
    id: "bx_old",
    k: "box",
    name: "قطع تجاوزت 30 يوماً بلا إجراء",
    when: "الساعة 09:00 يومياً",
    on: true,
    to: ["mgr"],
    lvl: "act",
    chan: "bell",
    txt: "{العدد} قطعة محفوظة بلا إجراء منذ أكثر من {الأيام} يوماً",
    go: "افتح السجلات",
  },
  bx_wk: {
    id: "bx_wk",
    k: "box",
    name: "ملخص المستودع الأسبوعي",
    when: "السبت 08:00",
    on: false,
    to: ["mgr"],
    lvl: "info",
    chan: "bell",
    txt: "بالمستودع {العدد} قطعة · أقدمها {الأيام} يوماً · قيمة تقديرية {المبلغ} ريال",
    go: "افتح لوحة المؤشرات",
  },
  aw_new: {
    id: "aw_new",
    k: "award",
    name: "ترشيح بانتظار الاعتماد",
    when: "فور التقديم",
    on: true,
    to: ["mgr"],
    lvl: "act",
    chan: "bell",
    txt: "ترشيح {الاسم} قدّمه {المرشِّح} بانتظار اعتمادك",
    go: "افتح الترشيح",
  },
  aw_res: {
    id: "aw_res",
    k: "award",
    name: "اعتماد ترشيحك أو رفضه",
    when: "فور القرار",
    on: true,
    to: ["own"],
    lvl: "info",
    chan: "toast",
    txt: "{القرار} ترشيحك لجائزة {الجائزة}",
    go: "افتح الترشيح",
  },
  aw_pub: {
    id: "aw_pub",
    k: "award",
    name: "إعلان النتائج",
    when: "فور الإعلان",
    on: true,
    to: ["own", "lead", "mgr"],
    lvl: "info",
    chan: "toast",
    txt: "أُعلنت نتائج {الجائزة} — {التفصيل}",
    go: "افتح لوحة النتائج",
  },
  aw_ref: {
    id: "aw_ref",
    k: "award",
    name: "تحديث المراجع المعتمدة",
    when: "فور الحفظ",
    on: true,
    to: ["lead", "mgr"],
    lvl: "info",
    chan: "bell",
    txt: "حُدّث قسم «{القسم}» في المراجع المعتمدة",
    go: "افتح المراجع",
  },
  aw_del: {
    id: "aw_del",
    k: "award",
    name: "حذف ترشيح",
    when: "فور الحذف",
    on: true,
    to: ["own", "mgr"],
    lvl: "act",
    chan: "bell",
    txt: "حُذف ترشيح {الاسم} بواسطة {المُعدّل}",
    go: "",
  },
  sc_dev: {
    id: "sc_dev",
    k: "sec",
    name: "دخول من جهاز جديد",
    when: "فور الدخول",
    on: true,
    to: ["own"],
    lvl: "act",
    chan: "toast",
    txt: "{الجهاز} — إن لم يكن أنت فأنهِ الجلسة",
    go: "الأمان",
  },
  sc_fail: {
    id: "sc_fail",
    k: "sec",
    name: "محاولات دخول فاشلة متكررة",
    when: "5 محاولات خلال 10 دقائق",
    on: true,
    to: ["own", "sys"],
    lvl: "urg",
    chan: "toast",
    txt: "{العدد} محاولات فاشلة على حساب {الاسم} من {IP}",
    go: "سجل الأمن",
  },
  sc_pw: {
    id: "sc_pw",
    k: "sec",
    name: "تغيير كلمة المرور",
    when: "فور التغيير",
    on: true,
    to: ["own"],
    lvl: "info",
    chan: "bell",
    txt: "غُيّرت كلمة مرورك من {الجهاز}",
    go: "",
  },
  sc_kill: {
    id: "sc_kill",
    k: "sec",
    name: "إنهاء جلساتك من مدير النظام",
    when: "فور الإنهاء",
    on: true,
    to: ["own"],
    lvl: "act",
    chan: "toast",
    txt: "أُنهيت جلساتك الأخرى بواسطة {المُعدّل}",
    go: "",
  },
  sc_deny: {
    id: "sc_deny",
    k: "sec",
    name: "محاولة كتابة مرفوضة من الخادم",
    when: "فور الرفض",
    on: true,
    to: ["sys"],
    lvl: "act",
    chan: "bell",
    txt: "رفض الخادم كتابة {المفتاح} من {الاسم} — السبب: {السبب}",
    go: "سجل الأمن",
  },
  sc_guard: {
    id: "sc_guard",
    k: "sec",
    name: "قفل حارس الدخول / فكه",
    when: "فور التغيير",
    on: true,
    to: ["sys"],
    lvl: "urg",
    chan: "toast",
    txt: "{الفعل} حارس الدخول — {التفصيل}",
    go: "سجل الأمن",
  },
  sc_policy: {
    id: "sc_policy",
    k: "sec",
    name: "تغيير سياسة الأمان",
    when: "فور الحفظ",
    on: true,
    to: ["sys"],
    lvl: "act",
    chan: "bell",
    txt: "غُيّرت سياسة الأمان: {التفصيل} — بواسطة {المُعدّل}",
    go: "الأمن",
  },
  sc_rk: {
    id: "sc_rk",
    k: "sec",
    name: "مفتاح الاستعادة أُنشئ / استُخدم",
    when: "فور الحدث",
    on: true,
    to: ["sys"],
    lvl: "urg",
    chan: "toast",
    txt: "{الفعل} مفتاح الاستعادة من {IP} — {النتيجة}",
    go: "الأمن",
  },
  pm_chg: {
    id: "pm_chg",
    k: "perm",
    name: "تغيّرت صلاحياتك",
    when: "فور التغيير",
    on: true,
    to: ["own"],
    lvl: "info",
    chan: "toast",
    txt: "{الفعل} {الصفحات} — بواسطة {المُغيّر}",
    go: "",
  },
  pm_cap: {
    id: "pm_cap",
    k: "perm",
    name: "تغيّر سقف صفحات الإدارة",
    when: "فور التغيير",
    on: true,
    to: ["mgr"],
    lvl: "act",
    chan: "bell",
    txt: "سقف إدارتك: {الفعل} {الصفحات} — بواسطة مدير النظام",
    go: "افتح الصلاحيات",
  },
  pm_tpl: {
    id: "pm_tpl",
    k: "perm",
    name: "قالب صلاحيات أُنشئ أو عُدّل أو حُذف",
    when: "فور الحفظ",
    on: true,
    to: ["mgr"],
    lvl: "info",
    chan: "bell",
    txt: "{الفعل} قالب «{القالب}» — {التفصيل} · بواسطة {المُعدّل}",
    go: "افتح الإعدادات",
  },
  sy_dept: {
    id: "sy_dept",
    k: "sys",
    name: "إنشاء إدارة / تعيين مديرها",
    when: "فور التغيير",
    on: true,
    to: ["sys"],
    lvl: "info",
    chan: "bell",
    txt: "{الفعل}: {الإدارة} — {التفصيل}",
    go: "",
  },
  sy_wipe: {
    id: "sy_wipe",
    k: "sys",
    name: "مسح بيانات إدارة",
    when: "فور المسح",
    on: true,
    to: ["sys"],
    lvl: "urg",
    chan: "toast",
    txt: "مُسحت بيانات إدارة {الإدارة} بواسطة {المُعدّل}",
    go: "افتح سجل الحركة",
  },
  sy_ddel: {
    id: "sy_ddel",
    k: "sys",
    name: "حذف إدارة أو إدارة عامة",
    when: "فور الحذف",
    on: true,
    to: ["sys"],
    lvl: "urg",
    chan: "toast",
    txt: "حُذفت {النوع} «{الإدارة}» — بواسطة {المُعدّل}",
    go: "افتح الإدارات",
  },
  sy_bkacc: {
    id: "sy_bkacc",
    k: "sys",
    name: "حساب احتياطي لمدير النظام أُنشئ / حُذف",
    when: "فور التغيير",
    on: true,
    to: ["sys"],
    lvl: "act",
    chan: "bell",
    txt: "{الفعل} الحساب الاحتياطي «{المستخدم}»",
    go: "الأمن",
  },
  sy_mods: {
    id: "sy_mods",
    k: "sys",
    name: "إطفاء وحدة أو تفعيلها على مستوى المنصة",
    when: "فور الحفظ",
    on: true,
    to: ["mgr"],
    lvl: "act",
    chan: "toast",
    txt: "{الفعل} وحدة «{الوحدة}» لكل المنصة — بواسطة مدير النظام",
    go: "",
  },
  sy_plat: {
    id: "sy_plat",
    k: "sys",
    name: "تغيير إعدادات المنصة (الهوية، الدخول، القوائم)",
    when: "فور النشر",
    on: true,
    to: ["sys"],
    lvl: "info",
    chan: "bell",
    txt: "نُشرت إعدادات المنصة: {التفصيل}",
    go: "المنصة",
  },
  sy_bk: {
    id: "sy_bk",
    k: "sys",
    name: "نسخة احتياطية أُنشئت / استيراد بيانات",
    when: "فور التنفيذ",
    on: true,
    to: ["sys"],
    lvl: "info",
    chan: "bell",
    txt: "{الفعل} بواسطة {المُعدّل} — {الحجم}",
    go: "النسخة الاحتياطية",
  },
  sy_nobk: {
    id: "sy_nobk",
    k: "sys",
    name: "لم تُنشأ نسخة احتياطية منذ 7 أيام",
    when: "فحص يومي 08:00",
    on: true,
    to: ["sys"],
    lvl: "act",
    chan: "toast",
    txt: "آخر نسخة احتياطية منذ {الأيام} يوماً",
    go: "النسخة الاحتياطية",
  },
  sy_sync: {
    id: "sy_sync",
    k: "sys",
    name: "انقطاع المزامنة مع الخادم",
    when: "بعد 5 دقائق انقطاع",
    on: true,
    to: ["own", "sys"],
    lvl: "urg",
    chan: "toast",
    txt: "تعذّر الحفظ في الخادم منذ {المدة} — تعديلاتك محفوظة محلياً",
    go: "",
  },
  sy_ver: {
    id: "sy_ver",
    k: "sys",
    name: "إصدار جديد من المنصة",
    when: "عند النشر",
    on: true,
    to: ["own"],
    lvl: "info",
    chan: "toast",
    txt: "نُشر الإصدار {الإصدار} — {الجديد}",
    go: "ما الجديد",
  },
  bc_new: {
    id: "bc_new",
    k: "bc",
    name: "تعميم جديد",
    when: "فور الإرسال",
    on: true,
    to: ["own"],
    lvl: "info",
    chan: "toast",
    txt: "{العنوان}",
    go: "افتح التعميم",
  },
  bc_rem: {
    id: "bc_rem",
    k: "bc",
    name: "تذكير بتعميم لم تقرأه",
    when: "بعد 24 ساعة",
    on: true,
    to: ["own"],
    lvl: "act",
    chan: "bell",
    txt: "لم تقرأ بعد: «{العنوان}»",
    go: "افتح التعميم",
  },
  bc_ack: {
    id: "bc_ack",
    k: "bc",
    name: "تعميم يتطلب تأكيدك",
    when: "فور الإرسال",
    on: true,
    to: ["own"],
    lvl: "act",
    chan: "toast",
    txt: "«{العنوان}» يتطلب تأكيد القراءة",
    go: "قرأت وفهمت",
  },
  bc_wd: {
    id: "bc_wd",
    k: "bc",
    name: "سحب تعميم",
    when: "فور السحب",
    on: false,
    to: ["own"],
    lvl: "info",
    chan: "bell",
    txt: "سُحب تعميم «{العنوان}» — لم يعد سارياً",
    go: "",
  },
};

var NF_REV = "bassam_notifications_domain_v1",
  NF_CFG_REV = "bassam_notif_cfg_v1",
  NF_BC_REV = "bassam_bc_v1",
  NF_TTL = 90 * 86400000;
var NF_GLOBAL = ["bassam_notif_sys_v1", "bassam_bc_v1", "bassam_notif_cfg_v1"];
var NF_CAP = {
  emp: "emps",
  task: "tasks",
  cust: "emps/custody",
  staff: "staff",
  plan: "plan",
  ready: "planning/readiness",
  rep: "dreport",
  round: "daily/rounds",
  irshad: "irshad",
  box: "seized",
  award: "award",
  perm: "admin/ptpls",
};
var NF_CAP_ID = { kp_att: "daily/kpiDaily", kp_occ: "daily/kpiOcc", st_shdef: "admin/shifts", fd_obs: "daily/field" };
var NF_MESSAGE_COLS = [
  "scope",
  "id",
  "kind",
  "department",
  "type",
  "category",
  "priority",
  "channel",
  "title",
  "body",
  "created_at",
  "author_key",
  "author_name",
  "action_text",
  "link",
  "requires_ack",
  "pinned",
  "preview",
  "department_broadcast",
  "expires_at",
  "withdrawn_at",
  "reminders",
  "scheduled",
  "target_mode",
  "recipient_count",
  "server_origin",
  "reminded_at",
];
var NF_TABLES = {
  messages: ["notification_messages", NF_MESSAGE_COLS],
  targets: ["notification_targets", ["scope", "message_id", "kind", "value"]],
  states: ["notification_user_state", ["account_uid", "message_scope", "message_id", "read_at", "acknowledged_at", "dismissed_at"]],
  dedup: ["notification_dedup", ["scope", "once_key", "created_at", "message_id"]],
  overrides: [
    "notification_type_overrides",
    [
      "type_id",
      "enabled",
      "priority",
      "channel",
      "template_text",
      "target_override",
      "target_own",
      "target_lead",
      "target_mgr",
      "target_sys",
    ],
  ],
  checkpoints: ["notification_checkpoints", ["scope", "name", "value"]],
};
function nfLegacyKey(k) {
  return String(k) === "bassam_notif_v1" || NF_GLOBAL.indexOf(String(k)) >= 0 || /^bsdept:[^:]+:bassam_notif_v1$/.test(String(k));
}
function nfErr(why, status) {
  var e = new Error(why);
  e.nf = why;
  e.status = status || 400;
  return e;
}
function nfShape(o, keys, required) {
  if (
    !isObj(o) ||
    Object.keys(o).some(function (k) {
      return keys.indexOf(k) < 0;
    }) ||
    (required || []).some(function (k) {
      return !Object.prototype.hasOwnProperty.call(o, k);
    })
  )
    throw nfErr("notification-shape");
  return o;
}
function nfStr(s, max, empty) {
  if (typeof s !== "string" || s.length > max || (!empty && !s.trim())) throw nfErr("notification-shape");
  return s;
}
function nfTime(n) {
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0) throw nfErr("notification-time");
  return n;
}
function nfArr(a, max) {
  if (!Array.isArray(a) || a.length > max) throw nfErr("notification-shape");
  return a;
}
function nfScope(d) {
  return d === "__sys" ? "sys" : "d:" + d;
}
function nfEncode(value) {
  var bytes = new TextEncoder().encode(JSON.stringify(value)),
    raw = "";
  for (var i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
  return btoa(raw).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function nfDecode(value) {
  var raw = atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    bytes = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}
function nfRef(scope, id) {
  return "nf:" + nfEncode([scope, id]);
}
function nfParseRef(ref) {
  try {
    if (typeof ref !== "string" || ref.slice(0, 3) !== "nf:") throw 0;
    var x = nfDecode(ref.slice(3));
    if (
      !Array.isArray(x) ||
      x.length !== 2 ||
      x.some(function (v) {
        return typeof v !== "string";
      })
    )
      throw 0;
    return x;
  } catch (e) {
    throw nfErr("notification-id");
  }
}
function nfBulk(env, table, cols, rows, mode) {
  var out = [],
    part = [],
    size = 2;
  function flush() {
    if (!part.length) return;
    out.push(
      env.DB.prepare(
        "INSERT " +
          (mode || "OR REPLACE") +
          " INTO " +
          table +
          " (" +
          cols.join(",") +
          ") SELECT " +
          cols
            .map(function (c) {
              return "json_extract(j.value,'$." + c + "')";
            })
            .join(",") +
          " FROM json_each(?1) j",
      ).bind(JSON.stringify(part)),
    );
    part = [];
    size = 2;
  }
  rows.forEach(function (r) {
    var n = new TextEncoder().encode(JSON.stringify(r)).byteLength + 1;
    if (n > 500000) throw nfErr("notification-row-large", 413);
    if (size + n > 500000) flush();
    part.push(r);
    size += n;
  });
  flush();
  return out;
}
async function nfRevision(env, key) {
  var r = await env.DB.prepare("SELECT rev FROM revs WHERE k=?1")
    .bind(key || NF_REV)
    .first();
  return r ? r.rev : 0;
}
async function nfFeedRevision(env, A) {
  var row = await env.DB.prepare("SELECT MAX(rev) AS rev FROM revs WHERE k IN (?1,?2)")
    .bind(NF_REV, "nf_state:" + A.u.id)
    .first();
  return (row && row.rev) || 0;
}
async function nfFeedRevisions(env, A) {
  var row = await env.DB.prepare(
    "SELECT COALESCE(MAX(CASE WHEN k IN (?1,?2) THEN rev END),0) AS feed_rev,COALESCE(MAX(CASE WHEN k=?3 THEN rev END),0) AS config_rev,COALESCE(MAX(CASE WHEN k=?4 THEN rev END),0) AS broadcast_rev FROM revs WHERE k IN (?1,?2,?3,?4)",
  ).bind(NF_REV, "nf_state:" + A.u.id, NF_CFG_REV, NF_BC_REV).first();
  return { feed: row.feed_rev, config: row.config_rev, broadcast: row.broadcast_rev };
}
async function nfRead(env) {
  var names = Object.keys(NF_TABLES),
    s = names.map(function (n) {
      return env.DB.prepare("SELECT * FROM " + NF_TABLES[n][0]);
    });
  s.push(env.DB.prepare("SELECT k,rev FROM revs WHERE k IN (?1,?2,?3)").bind(NF_REV, NF_CFG_REV, NF_BC_REV));
  var b = await env.DB.batch(s),
    o = { version: 1 };
  names.forEach(function (n, i) {
    o[n] = b[i].results || [];
  });
  var revs = b[names.length].results || [];
  function find(key) {
    var row = revs.filter(function (r) {
      return r.k === key;
    })[0];
    return row ? row.rev : 0;
  }
  o.rev = find(NF_REV);
  o.configRev = find(NF_CFG_REV);
  o.broadcastRev = find(NF_BC_REV);
  return o;
}
function nfCfg(rows) {
  var t = {};
  rows.forEach(function (r) {
    var o = {};
    if (r.enabled !== null) o.on = !!r.enabled;
    if (r.priority !== null) o.lvl = r.priority;
    if (r.channel !== null) o.chan = r.channel;
    if (r.template_text !== null) o.txt = r.template_text;
    if (r.target_override)
      o.to = ["own", "lead", "mgr", "sys"].filter(function (x) {
        return !!r["target_" + x];
      });
    t[r.type_id] = o;
  });
  return { t: t };
}
function nfType(id, cfg) {
  var t = NF_TYPES[id];
  if (!Object.prototype.hasOwnProperty.call(NF_TYPES, id)) throw nfErr("notification-type");
  var c = (cfg && cfg.t && cfg.t[id]) || {};
  return Object.assign({}, t, c, { to: Array.isArray(c.to) ? c.to : t.to, on: c.on === undefined ? t.on : !!c.on });
}
function nfOverride(id, o) {
  if (!Object.prototype.hasOwnProperty.call(NF_TYPES, id)) throw nfErr("notification-type");
  nfShape(o, ["on", "to", "lvl", "chan", "txt"]);
  if (o.on !== undefined && typeof o.on !== "boolean") throw nfErr("notification-shape");
  if (o.lvl !== undefined && ["info", "act", "urg"].indexOf(o.lvl) < 0) throw nfErr("notification-shape");
  if (o.chan !== undefined && ["bell", "toast"].indexOf(o.chan) < 0) throw nfErr("notification-shape");
  if (o.txt !== undefined) nfStr(o.txt, 4000, true);
  if (o.to !== undefined)
    nfArr(o.to, 4).forEach(function (x) {
      if (["own", "lead", "mgr", "sys"].indexOf(x) < 0) throw nfErr("notification-target");
    });
  return {
    type_id: id,
    enabled: o.on === undefined ? null : +o.on,
    priority: o.lvl === undefined ? null : o.lvl,
    channel: o.chan === undefined ? null : o.chan,
    template_text: o.txt === undefined ? null : o.txt,
    target_override: o.to === undefined ? 0 : 1,
    target_own: o.to && o.to.indexOf("own") >= 0 ? 1 : 0,
    target_lead: o.to && o.to.indexOf("lead") >= 0 ? 1 : 0,
    target_mgr: o.to && o.to.indexOf("mgr") >= 0 ? 1 : 0,
    target_sys: o.to && o.to.indexOf("sys") >= 0 ? 1 : 0,
  };
}
async function nfRefs(env, A, only) {
  var refs = A.__nfRefs || {},
    keys = [];
  (A.depts || []).forEach(function (d) {
    if (d && d.id && (!only || only.indexOf(d.id) >= 0) && !refs[d.id]) {
      refs[d.id] = {};
      ["employees_v1", "staffing_v3", "dreport_v1", "perm_tpls_v1"].forEach(function (s) {
        keys.push("bsdept:" + d.id + ":bassam_" + s);
      });
    }
  });
  for (var i = 0; i < keys.length; i += 80) {
    var vals = await opResourceMany(env, keys.slice(i, i + 80));
    Object.keys(vals).forEach(function (k) {
      var m = /^bsdept:([^:]+):bassam_(.*)$/.exec(k);
      if (m) refs[m[1]][m[2]] = parseJson(vals[k], null);
    });
  }
  A.__nfRefs = refs;
  return refs;
}
function nfLeader(A, u, d, refs) {
  // Preserve the established rule: leadership in any stored report, then the
  // explicitly supervised template. Restricting reports to today is a policy change.
  if (u.role !== "staff") return false;
  var r = refs[d] || {},
    dr = r.dreport_v1 || {},
    names = {};
  Object.keys(dr).forEach(function (k) {
    if (!/^\d+-\d+-\d+$/.test(k)) return;
    var sh = (dr[k] && dr[k].shifts) || {};
    Object.keys(sh).forEach(function (s) {
      var l = sh[s].leaders || {};
      if (l.chief) names[l.chief] = 1;
      if (l.deputy) names[l.deputy] = 1;
    });
  });
  if (u.name && names[u.name]) return true;
  var id = (((A.perms || {}).tplOf || {})[d] || {})[u.ekey],
    t = (Array.isArray(r.perm_tpls_v1) ? r.perm_tpls_v1 : []).filter(function (x) {
      return x && x.id === id;
    })[0];
  return !!(t && (t.sup === true || (t.sup === undefined && /رئيس|نائب/.test(t.name || ""))));
}
function nfShift(u, d, refs) {
  var r = refs[d] || {},
    st = r.staffing_v3 || {},
    months = Object.keys(st)
      .filter(function (k) {
        return /^\d+-\d+$/.test(k);
      })
      .sort(function (a, b) {
        var x = a.split("-").map(Number),
          y = b.split("-").map(Number);
        return y[0] - x[0] || y[1] - x[1];
      }),
    m = months[0];
  if (!m) return "";
  var e = (Array.isArray(r.employees_v1) ? r.employees_v1 : []).filter(function (x) {
      return x && (x.eid || x.name) === u.ekey;
    })[0],
    keys = e ? [e.nid, e.eid, u.ekey] : [u.ekey];
  for (var i = 0; i < keys.length; i++) {
    var v = keys[i] && st[m][keys[i]];
    if (v && v.shift) return String(v.shift);
  }
  return "";
}
function nfOwn(m, targets, u, refs) {
  var a = targets
    .filter(function (t) {
      return t.kind === "employee";
    })
    .map(function (t) {
      return t.value;
    });
  if (a.indexOf(String(u.id)) >= 0 || (u.ekey && a.indexOf(u.ekey) >= 0)) return true;
  if (u.role !== "staff") return false;
  if ((u.un && a.indexOf(u.un) >= 0) || (u.alt && a.indexOf(u.alt) >= 0)) return true;
  var r = refs[m.department || u.deptId] || {},
    e = (Array.isArray(r.employees_v1) ? r.employees_v1 : []).filter(function (x) {
      return x && (x.eid || x.name) === u.ekey;
    })[0];
  return !!(e && e.nid && a.indexOf(String(e.nid)) >= 0);
}
function nfPage(A, d, type, cat, act) {
  var page = NF_CAP_ID[type] || NF_CAP[cat];
  if (!page) return A.u.role === "super" || !["sys", "sec"].includes(cat);
  if (!d || !deptInScope(A, d) || !capOnDept(A, d, page)) return false;
  if (A.u.role === "super") return true;
  if (page.indexOf("admin/") === 0 && act === "view" && isMgrOf(A, d)) return true;
  if (A.enf) {
    var atom = KIVO_REGISTRY.atoms[page + ":" + act];
    return !!(
      atom &&
      atom.targets &&
      atom.targets.some(function (k) {
        return enfHeld(A, d, k);
      })
    );
  }
  return actsHeldOn(A, d, page, [act]);
}
function nfTargetHit(A, m, targets, u, refs) {
  if (m.kind === "broadcast") {
    if (u.role === "super") return true;
    if (u.dis) return false;
    var a = targets.map(function (t) {
      return t.value;
    });
    if (m.target_mode === "all") return true;
    if (m.target_mode === "dept")
      return (
        a.indexOf(u.deptId) >= 0 ||
        (u.role === "gm" &&
          a.some(function (d) {
            return deptInScope(Object.assign({}, A, { u: u }), d);
          }))
      );
    if (m.target_mode === "emp") return !!u.ekey && a.indexOf(u.ekey) >= 0;
    if (m.target_mode === "shift") return a.indexOf(nfShift(u, u.deptId, refs)) >= 0;
    var mgr = isMgrOf(Object.assign({}, A, { u: u }), u.deptId || "") || u.role === "gm",
      lead = nfLeader(A, u, u.deptId, refs);
    return (
      (a.indexOf("mgr") >= 0 && mgr) || (a.indexOf("lead") >= 0 && lead) || (a.indexOf("staff") >= 0 && u.role === "staff" && !mgr && !lead)
    );
  }
  if (m.scope === "sys" && u.role !== "super") return false;
  if (m.scope.indexOf("d:") === 0 && !deptInScope(Object.assign({}, A, { u: u }), m.scope.slice(2))) return false;
  if (nfOwn(m, targets, u, refs)) return true;
  var roles = targets
      .filter(function (t) {
        return t.kind === "role";
      })
      .map(function (t) {
        return t.value;
      }),
    hit =
      roles.indexOf("all") >= 0 ||
      (roles.indexOf("sys") >= 0 && u.role === "super") ||
      (roles.indexOf("mgr") >= 0 && u.role !== "super" && isMgrOf(Object.assign({}, A, { u: u }), m.department || u.deptId)) ||
      (roles.indexOf("lead") >= 0 && nfLeader(A, u, m.department || u.deptId, refs));
  return !!(
    hit &&
    (u.role === "super" ||
      nfPage(Object.assign({}, A, { u: u, __enfH: undefined, __enfG: undefined }), m.department || u.deptId, m.type, m.category, "view"))
  );
}
function nfTargetRows(scope, id, to) {
  var rows = [];
  ["e", "r"].forEach(function (kind) {
    (to[kind] || []).forEach(function (value) {
      rows.push({ scope: scope, message_id: id, kind: kind === "e" ? "employee" : "role", value: String(value) });
    });
  });
  return rows;
}
function nfMessage(scope, id, kind, v) {
  var row = {
    scope: scope,
    id: id,
    kind: kind,
    department: "",
    type: "",
    category: "",
    priority: "info",
    channel: "bell",
    title: "",
    body: "",
    created_at: Date.now(),
    author_key: "",
    author_name: "",
    action_text: "",
    link: "",
    requires_ack: 0,
    pinned: 0,
    preview: 0,
    department_broadcast: 0,
    expires_at: 0,
    withdrawn_at: 0,
    reminders: 0,
    scheduled: 0,
    target_mode: "message",
    recipient_count: 0,
    server_origin: 0,
    reminded_at: 0,
  };
  return Object.assign(row, v || {});
}
function nfUI(m, targets, state, A) {
  var r = {
    id: nfRef(m.scope, m.id),
    type: m.type,
    k: m.category,
    lvl: m.priority,
    chan: m.channel,
    t: m.title,
    b: m.body,
    at: m.created_at,
    by: m.author_key,
    byName: m.author_name,
    go: m.action_text,
    link: m.link,
    ack: !!m.requires_ack,
    pin: !!m.pinned,
    dept: m.department,
    un: !state.read_at,
    acked: !!state.acknowledged_at,
  };
  if (m.preview) r.test = 1;
  if (m.department_broadcast) r.bcDept = 1;
  if (m.expires_at) r.exp = m.expires_at;
  if (m.server_origin) r.srv = 1;
  r.deptName =
    (
      (A.depts || []).filter(function (d) {
        return d.id === m.department;
      })[0] || {}
    ).name || "";
  if (m.kind === "broadcast") {
    r.isBc = 1;
    r.bcId = m.id;
    r.t = "تعميم: " + m.title;
    r.chan = "toast";
    if (m.requires_ack && r.lvl === "info") r.lvl = "act";
  }
  return r;
}
function nfBroadcast(m, targets) {
  return {
    id: m.id,
    title: m.title,
    body: m.body,
    lvl: m.priority,
    link: m.link,
    ack: !!m.requires_ack,
    pin: !!m.pinned,
    rem: !!m.reminders,
    at: m.created_at,
    exp: m.expires_at,
    target: {
      mode: m.target_mode,
      sel: targets.map(function (t) {
        return t.value;
      }),
    },
    by: m.author_name,
    n: m.recipient_count,
    sched: !!m.scheduled,
    wd: m.withdrawn_at,
    remDone: m.reminded_at,
  };
}
function nfIndexes(doc) {
  var targets = {},
    states = {};
  doc.targets.forEach(function (t) {
    (targets[nfRef(t.scope, t.message_id)] || (targets[nfRef(t.scope, t.message_id)] = [])).push(t);
  });
  doc.states.forEach(function (s) {
    states[s.account_uid + "|" + nfRef(s.message_scope, s.message_id)] = s;
  });
  return { targets: targets, states: states };
}
async function nfStats(env, A, doc) {
  var out = {},
    refs = await nfRefs(env, A),
    ix = nfIndexes({ targets: doc.targets, states: [] }),
    queries = [],
    owners = [];
  doc.messages
    .filter(function (m) {
      return m.kind === "broadcast";
    })
    .forEach(function (m) {
      var ts = ix.targets[nfRef(m.scope, m.id)] || [],
        uids = Array.from(
          new Set(
            (A.users || [])
              .filter(function (u) {
                return u && !u.dis && u.role !== "super" && nfTargetHit(A, m, ts, u, refs);
              })
              .map(function (u) {
                return u.id;
              }),
          ),
        );
      out[m.id] = { n: uids.length, read: 0, ack: 0, unreadCount: uids.length };
      var part = [],
        size = 2;
      function flush() {
        if (!part.length) return;
        queries.push(
          env.DB.prepare(
            "SELECT SUM(CASE WHEN read_at>0 THEN 1 ELSE 0 END) AS r,SUM(CASE WHEN acknowledged_at>0 THEN 1 ELSE 0 END) AS a FROM notification_user_state WHERE message_scope='bc' AND message_id=?1 AND account_uid IN (SELECT value FROM json_each(?2))",
          ).bind(m.id, JSON.stringify(part)),
        );
        owners.push(m.id);
        part = [];
        size = 2;
      }
      uids.forEach(function (uid) {
        var n = new TextEncoder().encode(JSON.stringify(uid)).byteLength + 1;
        if (size + n > 400000) flush();
        part.push(uid);
        size += n;
      });
      flush();
    });
  if (queries.length) {
    var rs = await env.DB.batch(queries);
    rs.forEach(function (r, i) {
      var row = (r.results && r.results[0]) || {},
        state = out[owners[i]];
      state.read += row.r || 0;
      state.ack += row.a || 0;
    });
    Object.keys(out).forEach(function (k) {
      out[k].unreadCount = out[k].n - out[k].read;
    });
  }
  return out;
}
function nfRetention(env, now, scopes) {
  if (!scopes || !scopes.length) return [];
  var cut = now - NF_TTL,
    keys = JSON.stringify(scopes);
  return [
    env.DB.prepare(
      "DELETE FROM notification_messages WHERE kind='event' AND scope IN (SELECT value FROM json_each(?2)) AND (created_at<?1 OR EXISTS(SELECT 1 FROM (SELECT scope,id,row_number() OVER(PARTITION BY scope ORDER BY created_at DESC,id DESC) AS n FROM notification_messages WHERE kind='event' AND scope IN (SELECT value FROM json_each(?2))) x WHERE x.scope=notification_messages.scope AND x.id=notification_messages.id AND x.n>400))",
    ).bind(cut, keys),
    env.DB.prepare("DELETE FROM notification_dedup WHERE created_at<?1 AND scope IN (SELECT value FROM json_each(?2))").bind(cut, keys),
  ];
}
async function nfCommit(env, A, st, base, action, scopes, casKey) {
  casKey = casKey || NF_REV;
  if (!st.length) return { ok: 1, rev: A ? await nfFeedRevision(env, A) : await nfRevision(env), n: 0 };
  var revisionKey = action === "state" && A ? "nf_state:" + A.u.id : NF_REV,
    rev = await nextRev(env),
    all = (base === undefined ? [] : [revGuard(env, casKey, base)]).concat(st, nfRetention(env, Date.now(), scopes));
  all.push(
    env.DB.prepare("INSERT INTO revs(k,rev) VALUES(?1,?2) ON CONFLICT(k) DO UPDATE SET rev=MAX(revs.rev,excluded.rev)").bind(
      revisionKey,
      rev,
    ),
  );
  if (casKey !== NF_REV && action !== "preview")
    all.push(
      env.DB.prepare("INSERT INTO revs(k,rev) VALUES(?1,?2) ON CONFLICT(k) DO UPDATE SET rev=MAX(revs.rev,excluded.rev)").bind(casKey, rev),
    );
  if (A)
    all.push(
      audEvStmt(env, {
        cid: "nf_" + rev,
        ts: Date.now(),
        uid: A.u.id,
        k: NF_REV,
        rev: rev,
        etype: "dataset",
        eid: "notifications",
        act: action || "updated",
        ctx: "",
        bef: "",
        aft: "",
      }),
    );
  try {
    await env.DB.batch(all);
  } catch (e) {
    if (isRevConflict(e) || /KIVO_RESTORE_TARGET/.test(String(e))) throw nfErr("conflict", 409);
    if (/KIVO_NOTIFICATION_LEGACY_SOURCE/.test(String(e))) throw nfErr("notification-legacy-source-present", 503);
    throw e;
  }
  var receipt = { ok: 1, rev: A ? await nfFeedRevision(env, A) : await nfRevision(env) };
  if (casKey === NF_CFG_REV) receipt.configRev = await nfRevision(env, NF_CFG_REV);
  if (casKey === NF_BC_REV) receipt.broadcastRev = await nfRevision(env, NF_BC_REV);
  return receipt;
}
function nfLegacyConvert(keys) {
  var out = { version: 1, messages: [], targets: [], states: [], dedup: [], overrides: [], checkpoints: [] },
    users = parseJson(keys[K_USERS] || "[]", null),
    depts = parseJson(keys["bassam_depts_v1"] || "[]", null),
    stores = [],
    byMessage = {},
    stateMap = {};
  if (!Array.isArray(users) || !Array.isArray(depts)) throw nfErr("notification-cutover-identity-unknown");
  function parse(k) {
    var v = parseJson(keys[k], undefined);
    if (!isObj(v)) throw nfErr("notification-cutover-shape");
    if (v.v !== undefined && v.v !== 1) throw nfErr("notification-cutover-version");
    return v;
  }
  function bool(v) {
    if (v === undefined) return 0;
    if (typeof v !== "boolean" && v !== 0 && v !== 1) throw nfErr("notification-cutover-flag");
    return v ? 1 : 0;
  }
  function add(m, to) {
    var key = nfRef(m.scope, m.id);
    if (byMessage[key]) throw nfErr("notification-cutover-duplicate");
    byMessage[key] = m;
    out.messages.push(m);
    out.targets.push.apply(out.targets, to);
  }
  Object.keys(keys)
    .filter(nfLegacyKey)
    .sort()
    .forEach(function (k) {
      if (k === "bassam_notif_v1") throw nfErr("notification-cutover-scope-unknown");
      var v = parse(k);
      if (k === "bassam_notif_cfg_v1") {
        nfShape(v, ["t", "v"]);
        if (v.t !== undefined && !isObj(v.t)) throw nfErr("notification-cutover-config");
        Object.keys(v.t || {}).forEach(function (id) {
          out.overrides.push(nfOverride(id, v.t[id]));
        });
        return;
      }
      if (k === "bassam_bc_v1") {
        nfShape(v, ["items", "v"]);
        nfArr(v.items === undefined ? [] : v.items, 10000).forEach(function (b) {
          nfShape(
            b,
            ["id", "title", "body", "lvl", "link", "ack", "pin", "rem", "at", "exp", "target", "by", "n", "sched", "wd", "remDone"],
            ["id", "title", "body", "at"],
          );
          var target = b.target || { mode: "all", sel: [] };
          nfShape(target, ["mode", "sel"], ["mode"]);
          if (["all", "dept", "role", "shift", "emp"].indexOf(target.mode) < 0) throw nfErr("notification-cutover-target");
          var sel = target.sel || [];
          nfArr(sel, 20000).forEach(function (x) {
            nfStr(x, 200, false);
          });
          var m = nfMessage("bc", nfStr(b.id, 180, false), "broadcast", {
            type: "bc_new",
            category: "bc",
            priority: b.lvl || "info",
            channel: "toast",
            title: nfStr(b.title, 400, false),
            body: nfStr(b.body, 16000, true),
            created_at: nfTime(b.at),
            author_name: b.by === undefined ? "" : nfStr(b.by, 200, true),
            requires_ack: bool(b.ack),
            pinned: bool(b.pin),
            reminders: bool(b.rem),
            expires_at: b.exp === undefined ? 0 : nfTime(b.exp),
            withdrawn_at: b.wd === undefined ? 0 : nfTime(b.wd),
            scheduled: bool(b.sched),
            reminded_at: b.remDone === undefined ? 0 : nfTime(b.remDone),
            link: b.link === undefined ? "" : nfStr(b.link, 500, true),
            target_mode: target.mode,
            recipient_count: b.n === undefined ? 0 : nfTime(b.n),
          });
          if (["info", "act", "urg"].indexOf(m.priority) < 0) throw nfErr("notification-cutover-priority");
          add(
            m,
            sel.map(function (x) {
              return {
                scope: "bc",
                message_id: m.id,
                kind: { dept: "department", role: "role", shift: "shift", emp: "employee" }[target.mode] || "all",
                value: x,
              };
            }),
          );
        });
        return;
      }
      var scope = k === "bassam_notif_sys_v1" ? "sys" : nfScope(/^bsdept:([^:]+):/.exec(k)[1]),
        d = scope === "sys" ? "" : scope.slice(2);
      if (
        d &&
        !depts.some(function (x) {
          return x && x.id === d;
        })
      )
        throw nfErr("notification-cutover-department-unknown");
      nfShape(v, ["items", "read", "ack", "del", "seen", "v"]);
      nfArr(v.items || [], 10000).forEach(function (x) {
        nfShape(
          x,
          [
            "id",
            "type",
            "k",
            "lvl",
            "chan",
            "t",
            "b",
            "at",
            "by",
            "byName",
            "to",
            "go",
            "dept",
            "link",
            "exp",
            "ack",
            "pin",
            "test",
            "bcDept",
            "srv",
          ],
          ["id", "type", "k", "t", "b", "at", "to"],
        );
        if (!Object.prototype.hasOwnProperty.call(NF_TYPES, x.type) && x.type !== "bc_dept") throw nfErr("notification-cutover-type");
        nfShape(x.to, ["e", "r"]);
        var to = { e: x.to.e || [], r: x.to.r || [] };
        nfArr(to.e, 20000).forEach(function (y) {
          nfStr(y, 200, false);
        });
        nfArr(to.r, 8).forEach(function (y) {
          if (["own", "lead", "mgr", "sys", "all"].indexOf(y) < 0) throw nfErr("notification-cutover-target");
        });
        var m = nfMessage(scope, nfStr(x.id, 180, false), "event", {
          department: x.dept === undefined ? d : nfStr(x.dept, 180, true),
          type: x.type,
          category: nfStr(x.k, 40, false),
          priority: x.lvl || "info",
          channel: x.chan || "bell",
          title: nfStr(x.t, 400, true),
          body: nfStr(x.b, 16000, true),
          created_at: nfTime(x.at),
          author_key: x.by === undefined ? "" : nfStr(x.by, 200, true),
          author_name: x.byName === undefined ? "" : nfStr(x.byName, 200, true),
          action_text: x.go === undefined ? "" : nfStr(x.go, 500, true),
          link: x.link === undefined ? "" : nfStr(x.link, 500, true),
          requires_ack: bool(x.ack),
          pinned: bool(x.pin),
          preview: bool(x.test),
          department_broadcast: bool(x.bcDept),
          server_origin: bool(x.srv),
          expires_at: x.exp === undefined ? 0 : nfTime(x.exp),
        });
        if (
          m.category !== (m.type === "bc_dept" ? "bc" : NF_TYPES[m.type].k) ||
          ["info", "act", "urg"].indexOf(m.priority) < 0 ||
          ["bell", "toast"].indexOf(m.channel) < 0 ||
          (d && m.department !== d)
        )
          throw nfErr("notification-cutover-shape");
        add(m, nfTargetRows(scope, m.id, to));
      });
      var seen = v.seen || {};
      if (!isObj(seen)) throw nfErr("notification-cutover-seen");
      Object.keys(seen).forEach(function (once) {
        nfStr(once, 500, false);
        var ts = nfTime(seen[once]);
        if (once === "__sec") out.checkpoints.push({ scope: scope, name: "security-ts", value: ts });
        else out.dedup.push({ scope: scope, once_key: once, created_at: ts, message_id: null });
      });
      stores.push({ scope: scope, v: v });
    });
  stores.forEach(function (store) {
    ["read", "ack", "del"].forEach(function (field) {
      var map = store.v[field] || {};
      if (!isObj(map)) throw nfErr("notification-cutover-state");
      Object.keys(map).forEach(function (alias) {
        var candidates = users.filter(function (u) {
          return (
            u &&
            u.id &&
            (store.scope === "sys" ? u.role === "super" : u.deptId === store.scope.slice(2)) &&
            [u.id, u.ekey, u.un, u.alt].filter(Boolean).map(String).indexOf(alias) >= 0
          );
        });
        if (candidates.length !== 1) throw nfErr("notification-cutover-state-identity-unknown");
        var vals = map[alias];
        if (!isObj(vals)) throw nfErr("notification-cutover-state");
        Object.keys(vals).forEach(function (id) {
          var ts = nfTime(vals[id]),
            matches = out.messages.filter(function (m) {
              return id.slice(0, 3) === "bc:"
                ? m.kind === "broadcast" && m.id === id.slice(3)
                : m.id === id && (store.scope === "sys" || m.scope === store.scope);
            });
          if (!matches.length) throw nfErr("notification-cutover-state-message-unknown");
          if (matches.length !== 1) throw nfErr("notification-cutover-message-ambiguous");
          matches.forEach(function (m) {
            var uid = candidates[0].id,
              key = uid + "|" + nfRef(m.scope, m.id),
              r =
                stateMap[key] ||
                (stateMap[key] = {
                  account_uid: uid,
                  message_scope: m.scope,
                  message_id: m.id,
                  read_at: 0,
                  acknowledged_at: 0,
                  dismissed_at: 0,
                }),
              column = { read: "read_at", ack: "acknowledged_at", del: "dismissed_at" }[field];
            r[column] = Math.max(r[column], ts);
          });
        });
      });
    });
  });
  out.states = Object.keys(stateMap).map(function (k) {
    return stateMap[k];
  });
  return out;
}
async function nfLegacyPrepare(env) {
  var r = await env.DB.prepare(
      "SELECT k,seq,v FROM kv WHERE k IN ('bassam_auth_users_v1','bassam_depts_v1','bassam_notif_sys_v1','bassam_bc_v1','bassam_notif_cfg_v1','bassam_notif_v1') OR k LIKE 'bsdept:%:bassam_notif_v1' ORDER BY k,seq",
    ).all(),
    rows = r.results || [],
    legacy = rows.filter(function (x) {
      return nfLegacyKey(x.k);
    });
  if (!legacy.length) return { before: [], after: [], n: 0 };
  var keys = {}, sequence = {};
  rows.forEach(function (x) {
    if (!Number.isInteger(x.seq) || x.seq !== (sequence[x.k] || 0)) throw nfErr("notification-cutover-chunks");
    sequence[x.k] = x.seq + 1;
    keys[x.k] = (keys[x.k] || "") + x.v;
  });
  var data = nfLegacyConvert(keys),
    before = [],
    after = [],
    guardKeys = Object.keys(keys),
    sourceCount = rows.length;
  before.push(
    env.DB.prepare(
      "SELECT CASE WHEN (SELECT COUNT(*) FROM kv WHERE k IN ('bassam_notif_sys_v1','bassam_bc_v1','bassam_notif_cfg_v1','bassam_notif_v1') OR k LIKE 'bsdept:%:bassam_notif_v1') != ?1 THEN json_extract('{}','KIVO_NOTIFICATION_CUTOVER_SOURCE_CHANGED') END",
    ).bind(legacy.length),
  );
  before.push(
    env.DB.prepare(
      "SELECT CASE WHEN (SELECT COUNT(*) FROM kv WHERE k IN (SELECT value FROM json_each(?1))) != ?2 THEN json_extract('{}','KIVO_NOTIFICATION_CUTOVER_SOURCE_CHANGED') END",
    ).bind(JSON.stringify(guardKeys), sourceCount),
  );
  var part = [],
    size = 2;
  function flush() {
    if (!part.length) return;
    before.push(
      env.DB.prepare(
        "SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(?1) j LEFT JOIN kv ON kv.k=json_extract(j.value,'$.k') AND kv.seq=json_extract(j.value,'$.seq') WHERE kv.k IS NULL OR kv.v!=json_extract(j.value,'$.v')) THEN json_extract('{}','KIVO_NOTIFICATION_CUTOVER_SOURCE_CHANGED') END",
      ).bind(JSON.stringify(part)),
    );
    part = [];
    size = 2;
  }
  rows.forEach(function (row) {
    var n = new TextEncoder().encode(JSON.stringify(row)).byteLength;
    if (size + n > 500000) flush();
    part.push(row);
    size += n;
  });
  flush();
  before.push(env.DB.prepare("INSERT INTO meta(k,v) VALUES('nf_cutover_ready','validated') ON CONFLICT(k) DO UPDATE SET v=excluded.v"));
  Object.keys(NF_TABLES).forEach(function (name) {
    after.push(env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM " + NF_TABLES[name][0] + " LIMIT 1) THEN json_extract('{}','KIVO_NOTIFICATION_CUTOVER_TARGET_NOT_EMPTY') END"));
  });
  Object.keys(NF_TABLES).forEach(function (name) {
    after.push.apply(after, nfBulk(env, NF_TABLES[name][0], NF_TABLES[name][1], data[name]));
  });
  after.push(
    env.DB.prepare("DELETE FROM kv WHERE k IN (SELECT value FROM json_each(?1))").bind(
      JSON.stringify(Object.keys(keys).filter(nfLegacyKey)),
    ),
  );
  /* Advance retired resource revisions to invalidate any old writer already in flight. */
  var oldKeys = Object.keys(keys).filter(nfLegacyKey);
  parseJson(keys["bassam_depts_v1"] || "[]", []).forEach(function (d) {
    if (d && d.id) oldKeys.push("bsdept:" + d.id + ":bassam_notif_v1");
  });
  NF_GLOBAL.forEach(function (k) {
    if (oldKeys.indexOf(k) < 0) oldKeys.push(k);
  });
  oldKeys.push(NF_REV);
  after.push(
    env.DB.prepare("INSERT INTO meta(k,v) VALUES('rev','1') ON CONFLICT(k) DO UPDATE SET v=CAST(CAST(meta.v AS INTEGER)+1 AS TEXT)"),
  );
  after.push(
    env.DB.prepare(
      "INSERT INTO revs(k,rev) SELECT value,CAST((SELECT v FROM meta WHERE k='rev') AS INTEGER) FROM json_each(?1) WHERE 1 ON CONFLICT(k) DO UPDATE SET rev=excluded.rev",
    ).bind(JSON.stringify(Array.from(new Set(oldKeys)))),
  );
  return { before: before, after: after, n: data.messages.length };
}

async function nfAudience(env, A, opts) {
  var depts = (A.depts || [])
      .filter(function (d) {
        return d && deptInScope(A, d.id) && (!opts.dept || (A.u.role === "super" && opts.all) || d.id === opts.dept);
      })
      .map(function (d) {
        return d.id;
      }),
    // Super inbox matching uses account keys and fixed roles only. Broadcasts
    // are visible directly; staff recipient statistics still load their refs.
    refs = A.u.role === "super" ? {} : await nfRefs(env, A, depts),
    aud = [],
    bc = [],
    u = A.u;
  function add(scope, kind, value, type) {
    if (value) aud.push({ scope: scope, kind: kind, value: String(value), type: type || "*" });
  }
  depts.forEach(function (d) {
    var scope = nfScope(d),
      r = refs[d] || {},
      e = (Array.isArray(r.employees_v1) ? r.employees_v1 : []).filter(function (x) {
        return x && (x.eid || x.name) === u.ekey;
      })[0];
    [u.id, u.ekey]
      .concat(u.role === "staff" ? [u.un, u.alt, e && e.nid] : [])
      .filter(Boolean)
      .forEach(function (k) {
        add(scope, "employee", k);
      });
    var roles = ["all"];
    if (u.role === "super") roles.push("sys");
    else if (isMgrOf(A, d)) roles.push("mgr");
    if (nfLeader(A, u, d, refs)) roles.push("lead");
    Object.keys(NF_TYPES)
      .concat(["bc_dept"])
      .forEach(function (type) {
        var cat = NF_TYPES[type] ? NF_TYPES[type].k : "bc";
        if (u.role === "super" || nfPage(A, d, type, cat, "view"))
          roles.forEach(function (role) {
            add(scope, "role", role, type);
          });
      });
  });
  if (u.role === "super") {
    [u.id, u.ekey].filter(Boolean).forEach(function (k) {
      add("sys", "employee", k);
    });
    ["all", "sys"].forEach(function (k) {
      add("sys", "role", k);
    });
  }
  if (u.deptId) bc.push({ kind: "department", value: u.deptId });
  if (u.role === "gm")
    depts.forEach(function (d) {
      bc.push({ kind: "department", value: d });
    });
  if (u.ekey) bc.push({ kind: "employee", value: u.ekey });
  var mgr = u.role === "gm" || (u.role !== "super" && isMgrOf(A, u.deptId || "")),
    lead = nfLeader(A, u, u.deptId, refs);
  if (mgr) bc.push({ kind: "role", value: "mgr" });
  if (lead) bc.push({ kind: "role", value: "lead" });
  if (u.role === "staff" && !mgr && !lead) bc.push({ kind: "role", value: "staff" });
  var shift = nfShift(u, u.deptId, refs);
  if (shift) bc.push({ kind: "shift", value: shift });
  return { aud: aud, bc: bc, scopes: depts.map(nfScope).concat(u.role === "super" ? ["sys"] : []) };
}
async function nfFeedRows(env, A, opts) {
  opts = opts || {};
  if (opts.dept && !deptInScope(A, opts.dept)) throw nfErr("notification-scope", 403);
  var audience = await nfAudience(env, A, opts),
    now = Date.now(),
    rev = opts.feedRevision === undefined ? await nfFeedRevision(env, A) : opts.feedRevision,
    bind = [A.u.id, now, JSON.stringify(audience.scopes), JSON.stringify(audience.aud), JSON.stringify(audience.bc)],
    where =
      "(m.kind='broadcast' OR m.created_at>=?2-7776000000) AND m.withdrawn_at=0 AND m.created_at<=?2 AND (m.expires_at=0 OR m.expires_at>=?2) AND COALESCE(s.dismissed_at,0)=0 AND ((m.kind='event' AND m.scope IN (SELECT value FROM json_each(?3)) AND EXISTS(SELECT 1 FROM notification_targets t JOIN json_each(?4) a ON json_extract(a.value,'$.scope')=t.scope AND json_extract(a.value,'$.kind')=t.kind AND json_extract(a.value,'$.value')=t.value WHERE t.scope=m.scope AND t.message_id=m.id AND (json_extract(a.value,'$.type')='*' OR json_extract(a.value,'$.type')=m.type))) OR (m.kind='broadcast' AND " +
      (A.u.role === "super"
        ? "1"
        : "(m.target_mode='all' OR EXISTS(SELECT 1 FROM notification_targets t JOIN json_each(?5) a ON json_extract(a.value,'$.kind')=t.kind AND json_extract(a.value,'$.value')=t.value WHERE t.scope=m.scope AND t.message_id=m.id))") +
      "))";
  if (A.u.role === "super" && !opts.all) where += " AND (m.department='' OR m.department=?6 OR m.category IN ('sys','sec'))";
  bind.push(opts.dept || A.u.deptId || "");
  where += " AND json_valid(?5) AND ?6 IS NOT NULL";
  var from =
      " FROM notification_messages m LEFT JOIN notification_user_state s ON s.account_uid=?1 AND s.message_scope=m.scope AND s.message_id=m.id WHERE ",
    pin = "CASE WHEN m.pinned=1 AND COALESCE(s.read_at,0)=0 THEN 1 ELSE 0 END",
    cursor = opts.cursor || "",
    tail = "";
  if (cursor) {
    var c;
    try {
      c = nfDecode(cursor);
    } catch (e) {
      throw nfErr("notification-cursor");
    }
    if (!isObj(c) || c.rev !== rev) throw nfErr("conflict", 409);
    nfTime(c.at);
    if (c.pin !== 0 && c.pin !== 1) throw nfErr("notification-cursor");
    nfStr(c.scope, 200, false);
    nfStr(c.id, 180, false);
    bind.push(c.pin, c.at, c.scope, c.id);
    tail =
      " AND (" + pin + "<?7 OR (" + pin + "=?7 AND (m.created_at<?8 OR (m.created_at=?8 AND (m.scope>?9 OR (m.scope=?9 AND m.id>?10))))))";
  }

  var countersSql =
      "SELECT m.category AS k,COUNT(*) AS n,SUM(CASE WHEN COALESCE(s.read_at,0)=0 THEN 1 ELSE 0 END) AS unread,SUM(CASE WHEN m.priority='act' OR (m.requires_ack=1 AND COALESCE(s.acknowledged_at,0)=0) THEN 1 ELSE 0 END) AS actionable,SUM(CASE WHEN m.priority='urg' AND COALESCE(s.read_at,0)=0 THEN 1 ELSE 0 END) AS urgentUnread,SUM(CASE WHEN m.requires_ack=1 AND COALESCE(s.acknowledged_at,0)=0 THEN 1 ELSE 0 END) AS pendingAck" +
      from +
      where +
      " GROUP BY m.category",
    counterStmt = env.DB.prepare(countersSql),
    groups = (await counterStmt.bind.apply(counterStmt, bind.slice(0, 6)).all()).results || [],
    counts = { total: 0, unread: 0, actionable: 0, urgentUnread: 0, pendingAck: 0, byKind: {} };
  groups.forEach(function (g) {
    counts.total += g.n;
    counts.unread += g.unread || 0;
    counts.actionable += g.actionable || 0;
    counts.urgentUnread += g.urgentUnread || 0;
    counts.pendingAck += g.pendingAck || 0;
    counts.byKind[g.k] = g.n;
  });
  if (opts.summary) return Object.assign({ rev: rev, rows: [], targets: [], next: "" }, counts);
  var filter = opts.filter || "all",
    allowedKinds = Array.from(
      new Set(
        Object.keys(NF_TYPES)
          .map(function (k) {
            return NF_TYPES[k].k;
          })
          .concat(["bc"]),
      ),
    ),
    kinds = opts.kinds ? String(opts.kinds).split(",").filter(Boolean) : [];
  if (
    ["all", "act", "un"].indexOf(filter) < 0 ||
    kinds.some(function (k) {
      return allowedKinds.indexOf(k) < 0;
    })
  )
    throw nfErr("notification-filter");
  var filtered = where;
  if (filter === "un") filtered += " AND COALESCE(s.read_at,0)=0";
  if (filter === "act") filtered += " AND (m.priority='act' OR (m.requires_ack=1 AND COALESCE(s.acknowledged_at,0)=0))";
  if (kinds.length)
    filtered +=
      " AND m.category IN (" +
      kinds
        .map(function (k) {
          return "'" + k + "'";
        })
        .join(",") +
      ")";
  var limit = Math.min(1000, Math.max(1, opts.limit || 200)),
    sql =
      "SELECT m.*,COALESCE(s.read_at,0) AS read_at,COALESCE(s.acknowledged_at,0) AS acknowledged_at,COALESCE(s.dismissed_at,0) AS dismissed_at" +
      from +
      filtered +
      tail +
      " ORDER BY " +
      pin +
      " DESC,m.created_at DESC,m.scope,m.id LIMIT " +
      (limit + 1),
    stmt = env.DB.prepare(sql),
    rows = (await stmt.bind.apply(stmt, bind).all()).results || [],
    more = rows.length > limit;
  rows = rows.slice(0, limit);
  var last = rows[rows.length - 1],
    next =
      more && last
        ? nfEncode({ rev: rev, pin: last.pinned && !last.read_at ? 1 : 0, at: last.created_at, scope: last.scope, id: last.id })
        : "";
  return Object.assign({ rev: rev, rows: rows, targets: [], next: next }, counts);
}
async function nfFeedOnce(env, A, url) {
  var opts = {
      all: url.searchParams.get("all") === "1",
      dept: url.searchParams.get("dept") || A.u.deptId || "",
      cursor: url.searchParams.get("cursor") || "",
      limit: Math.min(200, +url.searchParams.get("limit") || 200),
      filter: url.searchParams.get("filter") || "all",
      kinds: url.searchParams.get("kinds") || "",
      summary: url.searchParams.get("summary") === "1",
    },
    result = await nfFeedRows(env, A, opts),
    out = {
      ok: 1,
      rev: result.rev,
      items: result.rows.map(function (m) {
        return nfUI(m, [], m, A);
      }),
      total: result.total,
      unread: result.unread,
      actionable: result.actionable,
      urgentUnread: result.urgentUnread,
      pendingAck: result.pendingAck,
      byKind: result.byKind,
      next: result.next,
    };
  // Independent configuration and all-department counters need no serial wait.
  // The final revision check below retries any intervening domain mutation.
  var extras = await Promise.all([
    env.DB.prepare("SELECT * FROM notification_type_overrides").all(),
    A.u.role === "super" && !opts.all
      ? nfFeedRows(env, A, { all: true, summary: true, feedRevision: result.rev })
      : Promise.resolve({ unread: result.unread }),
  ]);
  out.cfg = nfCfg(extras[0].results || []);
  out.unreadAll = extras[1].unread;
  out.counters = {
    total: out.total,
    unread: out.unread,
    actionable: out.actionable,
    urgentUnread: out.urgentUnread,
    pendingAck: out.pendingAck,
    unreadAll: out.unreadAll,
    byKind: out.byKind,
  };
  if (A.u.role === "super" && url.searchParams.get("manage") === "1") Object.assign(out, await nfManage(env, A, url));
  return out;
}
async function nfManage(env, A, url) {
  var rev = await nfRevision(env, NF_BC_REV),
    cursor = url.searchParams.get("bcCursor") || "",
    st,
    query = "SELECT * FROM notification_messages WHERE scope='bc' AND kind='broadcast'",
    args = [];
  if (cursor) {
    var c;
    try {
      c = nfDecode(cursor);
    } catch (e) {
      throw nfErr("notification-cursor");
    }
    if (c.rev !== rev) throw nfErr("conflict", 409);
    nfTime(c.at);
    nfStr(c.id, 180, false);
    query += " AND (created_at<?1 OR (created_at=?1 AND id<?2))";
    args = [c.at, c.id];
  }
  query += " ORDER BY created_at DESC,id DESC LIMIT 26";
  st = env.DB.prepare(query);
  var messages = (await st.bind.apply(st, args).all()).results || [],
    more = messages.length > 25;
  messages = messages.slice(0, 25);
  var ids = JSON.stringify(
      messages.map(function (m) {
        return m.id;
      }),
    ),
    targets =
      (
        await env.DB.prepare("SELECT * FROM notification_targets WHERE scope='bc' AND message_id IN (SELECT value FROM json_each(?1))")
          .bind(ids)
          .all()
      ).results || [],
    last = messages[messages.length - 1],
    total = await env.DB.prepare("SELECT COUNT(*) AS n FROM notification_messages WHERE scope='bc' AND kind='broadcast'").first(),
    doc = { messages: messages, targets: targets };
  return {
    broadcasts: messages.map(function (m) {
      return nfBroadcast(
        m,
        targets.filter(function (t) {
          return t.message_id === m.id;
        }),
      );
    }),
    bcTotal: total.n,
    bcNext: more && last ? nfEncode({ rev: rev, at: last.created_at, id: last.id }) : "",
    stats: await nfStats(env, A, doc),
  };
}

function nfNewId(prefix) {
  return (prefix || "n") + Date.now().toString(36) + randTok().slice(0, 16);
}
function nfFill(txt, vars) {
  var s = String(txt || "");
  Object.keys(vars || {}).forEach(function (k) {
    s = s.split(k.charAt(0) === "{" ? k : "{" + k + "}").join(String(vars[k] == null ? "" : vars[k]));
  });
  return s
    .replace(/\{[^}]+\}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
function nfInsertPlans(env, plans) {
  var st = [],
    once = [],
    messages = [],
    targets = [];
  plans.forEach(function (p) {
    if (p.once) once.push({ scope: p.m.scope, once_key: p.once, created_at: p.m.created_at, message_id: p.m.id });
    messages.push(Object.assign({}, p.m, { once_key: p.once || "" }));
    targets.push.apply(targets, p.targets);
  });
  if (once.length)
    st.push(
      env.DB.prepare("DELETE FROM notification_dedup WHERE created_at<?1 AND scope IN (SELECT value FROM json_each(?2))").bind(
        Date.now() - NF_TTL,
        JSON.stringify(
          Array.from(
            new Set(
              once.map(function (r) {
                return r.scope;
              }),
            ),
          ),
        ),
      ),
    );
  st.push.apply(st, nfBulk(env, "notification_dedup", NF_TABLES.dedup[1], once, "OR IGNORE"));
  var chunks = [];
  var part = [],
    size = 2;
  function flush() {
    if (part.length) {
      chunks.push(part);
      part = [];
      size = 2;
    }
  }
  messages.forEach(function (m) {
    var n = new TextEncoder().encode(JSON.stringify(m)).byteLength;
    if (size + n > 500000) flush();
    part.push(m);
    size += n;
  });
  flush();
  chunks.forEach(function (rows) {
    st.push(
      env.DB.prepare(
        "INSERT INTO notification_messages(" +
          NF_MESSAGE_COLS.join(",") +
          ") SELECT " +
          NF_MESSAGE_COLS.map(function (c) {
            return "json_extract(j.value,'$." + c + "')";
          }).join(",") +
          " FROM json_each(?1) j WHERE json_extract(j.value,'$.once_key')='' OR EXISTS(SELECT 1 FROM notification_dedup d WHERE d.scope=json_extract(j.value,'$.scope') AND d.once_key=json_extract(j.value,'$.once_key') AND d.message_id=json_extract(j.value,'$.id'))",
      ).bind(JSON.stringify(rows)),
    );
  });
  if (targets.length) {
    var tpart = [],
      tsize = 2;
    function tflush() {
      if (!tpart.length) return;
      st.push(
        env.DB.prepare(
          "INSERT OR IGNORE INTO notification_targets(scope,message_id,kind,value) SELECT json_extract(j.value,'$.scope'),json_extract(j.value,'$.message_id'),json_extract(j.value,'$.kind'),json_extract(j.value,'$.value') FROM json_each(?1) j WHERE EXISTS(SELECT 1 FROM notification_messages m WHERE m.scope=json_extract(j.value,'$.scope') AND m.id=json_extract(j.value,'$.message_id'))",
        ).bind(JSON.stringify(tpart)),
      );
      tpart = [];
      tsize = 2;
    }
    targets.forEach(function (t) {
      var n = new TextEncoder().encode(JSON.stringify(t)).byteLength;
      if (tsize + n > 500000) tflush();
      tpart.push(t);
      tsize += n;
    });
    tflush();
  }
  return st;
}
function nfInsertEvent(env, m, targets, once) {
  return nfInsertPlans(env, [{ m: m, targets: targets, once: once || "" }]);
}
async function nfPlanEvents(env, A, events, internal) {
  await nfGuardRetired(env);
  nfArr(events, 200);
  var overrideRows = (await env.DB.prepare("SELECT * FROM notification_type_overrides").all()).results || [],
    cfg = nfCfg(overrideRows),
    ids = [],
    plans = [];
  events.forEach(function (it) {
    nfShape(it, ["type", "dept", "own", "vars", "title", "once", "link", "at"]);
    var T = nfType(nfStr(it.type, 80, false), cfg);
    if (!T.on) return;
    var d = it.dept || A.u.deptId || "",
      own = it.own || [];
    nfArr(own, 20000).forEach(function (k) {
      nfStr(k, 200, false);
    });
    if (it.vars !== undefined) {
      if (!isObj(it.vars) || Object.keys(it.vars).length > 60) throw nfErr("notification-vars");
      Object.keys(it.vars).forEach(function (k) {
        nfStr(k, 100, false);
        if (typeof it.vars[k] !== "string" && typeof it.vars[k] !== "number") throw nfErr("notification-vars");
        if (String(it.vars[k]).length > 4000) throw nfErr("notification-vars");
      });
    }
    if (it.title !== undefined) nfStr(it.title, 400, true);
    if (it.link !== undefined) nfStr(it.link, 500, true);
    if (it.once !== undefined) nfStr(it.once, 500, false);
    if (it.at !== undefined) nfTime(it.at);
    var toE = T.to.indexOf("own") >= 0 ? own : [],
      toR = T.to.filter(function (r) {
        return r !== "own";
      }),
      sys = toR.length === 1 && toR[0] === "sys" && !toE.length && A.u.role === "super";
    if (!sys && (!d || !deptInScope(A, d))) throw nfErr("notification-scope", 403);
    var selfOnly =
      ["sys", "sec"].indexOf(T.k) >= 0 &&
      !toR.length &&
      toE.length &&
      toE.every(function (k) {
        return k === A.u.id || k === A.u.ekey;
      });
    if (!internal && !sys && !selfOnly && !nfPage(A, d, T.id, T.k, "view")) throw nfErr("notification-scope", 403);
    if (
      !internal &&
      ["sys", "sec"].indexOf(T.k) >= 0 &&
      A.u.role !== "super" &&
      !(
        toR.length === 0 &&
        toE.length &&
        toE.every(function (k) {
          return k === A.u.id || k === A.u.ekey;
        })
      )
    )
      throw nfErr("notification-scope", 403);
    if (
      d &&
      !(A.depts || []).some(function (x) {
        return x && x.id === d;
      })
    )
      throw nfErr("notification-department-unknown");
    if (!toE.length && !toR.length) return;
    var m = nfMessage(sys ? "sys" : nfScope(d), nfNewId(), "event", {
        department: d,
        type: T.id,
        category: T.k,
        priority: T.lvl,
        channel: T.chan,
        title: it.title || T.name,
        body: nfFill(T.txt, it.vars),
        created_at: it.at || Date.now(),
        author_key: String(A.u.ekey || A.u.id),
        author_name: String(A.u.name || A.u.un || ""),
        action_text: T.go || "",
        link: it.link || "",
        server_origin: internal ? 1 : 0,
      }),
      targets = nfTargetRows(m.scope, m.id, { e: toE, r: toR });
    plans.push({ m: m, targets: targets, once: it.once || "" });
    ids.push(nfRef(m.scope, m.id));
  });
  var requested = plans.length;
  if (
    plans.some(function (p) {
      return !!p.once;
    })
  ) {
    var existing =
      (
        await env.DB.prepare(
          "SELECT scope,once_key FROM notification_dedup WHERE created_at>=?2 AND EXISTS(SELECT 1 FROM json_each(?1) j WHERE notification_dedup.scope=json_extract(j.value,'$.scope') AND notification_dedup.once_key=json_extract(j.value,'$.once'))",
        )
          .bind(
            JSON.stringify(
              plans
                .filter(function (p) {
                  return !!p.once;
                })
                .map(function (p) {
                  return { scope: p.m.scope, once: p.once };
                }),
            ),
            Date.now() - NF_TTL,
          )
          .all()
      ).results || [];
    plans = plans.filter(function (p) {
      return (
        !p.once ||
        !existing.some(function (r) {
          return r.scope === p.m.scope && r.once_key === p.once;
        })
      );
    });
    ids = [];
  }
  return {
    plans: plans, ids: ids, requested: requested, statements: nfInsertPlans(env, plans),
    scopes: Array.from(new Set(plans.map(function (p) { return p.m.scope; }))),
    guards: rsWitness(env, NF_TABLES.overrides[0], NF_TABLES.overrides[1], overrideRows).concat([
      env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE k IN ('bassam_notif_sys_v1','bassam_bc_v1','bassam_notif_cfg_v1','bassam_notif_v1') OR k GLOB 'bsdept:*:bassam_notif_v1') THEN json_extract('{}','KIVO_NOTIFICATION_LEGACY_SOURCE') END"),
    ]),
  };
}
async function nfEmitEvents(env, A, events, internal, extra) {
  var plan = await nfPlanEvents(env, A, events, internal), plans = plan.plans, ids = plan.ids,
    requested = plan.requested, st = plan.statements.concat(extra || []);
  if (st.length) st = plan.guards.concat(st);
  var result = await nfCommit(
    env,
    A,
    st,
    undefined,
    "emitted",
    plan.scopes,
  );
  if (plans.length) {
    var found = await env.DB.prepare(
      "SELECT scope,id FROM notification_messages WHERE EXISTS(SELECT 1 FROM json_each(?1) j WHERE notification_messages.scope=json_extract(j.value,'$.scope') AND notification_messages.id=json_extract(j.value,'$.id'))",
    )
      .bind(
        JSON.stringify(
          plans.map(function (p) {
            return { scope: p.m.scope, id: p.m.id };
          }),
        ),
      )
      .all();
    ids = (found.results || []).map(function (r) {
      return nfRef(r.scope, r.id);
    });
  }
  return Object.assign(result, { n: ids.length, ids: ids, id: ids[0] || "", duplicate: requested > 0 && ids.length === 0 });
}
async function nfState(env, A, body) {
  nfShape(body, ["uid", "op", "action", "id", "onlyRead", "dept", "all"], ["op", "action"]);
  if (["read", "ack", "dismiss", "read-all", "dismiss-all"].indexOf(body.action) < 0) throw nfErr("notification-action");
  var opts = { all: !!body.all, dept: body.dept || A.u.deptId || "", limit: 1000 },
    selected = [],
    page;
  do {
    page = await nfFeedRows(env, A, opts);
    selected.push.apply(selected, page.rows);
    opts.cursor = page.next;
    if (selected.length > 10000) throw nfErr("notification-state-large", 413);
  } while (page.next);
  var bulk = body.action === "read-all" || body.action === "dismiss-all",
    action = body.action.split("-")[0];
  if (!bulk) {
    nfStr(body.id, 800, false);
    var ref = nfParseRef(body.id);
    selected = selected.filter(function (m) {
      return m.scope === ref[0] && m.id === ref[1];
    });
    if (!selected.length) throw nfErr("notification-not-found", 404);
  }
  var st = [],
    now = Date.now(),
    n = 0;
  selected.forEach(function (m) {
    if (body.onlyRead && !m.read_at) return;
    if (action === "dismiss" && m.requires_ack && !m.acknowledged_at) {
      if (!bulk) throw nfErr("notification-ack-required", 403);
      return;
    }
    if (bulk && action === "read" && m.requires_ack && !m.acknowledged_at) return;
    st.push(
      env.DB.prepare(
        "INSERT INTO notification_user_state(account_uid,message_scope,message_id,read_at,acknowledged_at,dismissed_at) VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(account_uid,message_scope,message_id) DO UPDATE SET read_at=CASE WHEN notification_user_state.read_at=0 THEN excluded.read_at ELSE notification_user_state.read_at END,acknowledged_at=MAX(notification_user_state.acknowledged_at,excluded.acknowledged_at),dismissed_at=MAX(notification_user_state.dismissed_at,excluded.dismissed_at)",
      ).bind(A.u.id, m.scope, m.id, now, action === "ack" ? now : 0, action === "dismiss" ? now : 0),
    );
    n++;
  });
  return Object.assign(await nfCommit(env, A, st, undefined, "state"), { n: n });
}
function nfBroadcastInput(b) {
  nfShape(b, ["title", "body", "lvl", "link", "ack", "pin", "rem", "at", "expDays", "target", "emps"], ["title", "body"]);
  nfStr(b.title, 400, false);
  nfStr(b.body, 16000, false);
  if (b.lvl !== undefined && ["info", "act", "urg"].indexOf(b.lvl) < 0) throw nfErr("notification-shape");
  if (b.link !== undefined) nfStr(b.link, 500, true);
  ["ack", "pin", "rem"].forEach(function (k) {
    if (b[k] !== undefined && typeof b[k] !== "boolean") throw nfErr("notification-shape");
  });
  if (b.at !== undefined) nfTime(b.at);
  if (b.expDays !== undefined && (!Number.isInteger(b.expDays) || b.expDays < 0 || b.expDays > 3650)) throw nfErr("notification-expiry");
  var target = b.target || { mode: "all", sel: [] };
  nfShape(target, ["mode", "sel"], ["mode"]);
  if (["all", "dept", "role", "shift", "emp"].indexOf(target.mode) < 0) throw nfErr("notification-target");
  nfArr(target.sel || [], 20000).forEach(function (k) {
    nfStr(k, 200, false);
    if (target.mode === "role" && ["mgr", "lead", "staff"].indexOf(k) < 0) throw nfErr("notification-target");
  });
  return target;
}
async function nfTargets(env, A, target) {
  var mode = nfBroadcastInput({ title: "preview", body: "preview", target: target }),
    refs = await nfRefs(env, A),
    m = nfMessage("bc", "preview", "broadcast", { target_mode: mode.mode }),
    targets = (mode.sel || []).map(function (value) {
      return { kind: { dept: "department", role: "role", shift: "shift", emp: "employee" }[mode.mode] || "all", value: value };
    }),
    n = (A.users || []).filter(function (u) {
      return u && !u.dis && u.role !== "super" && nfTargetHit(A, m, targets, u, refs);
    }).length,
    shifts = {};
  (A.users || []).forEach(function (u) {
    if (!u || u.dis) return;
    var shift = nfShift(u, u.deptId, refs);
    if (shift) shifts[shift] = (shifts[shift] || 0) + 1;
  });
  return {
    n: n,
    shifts: Object.keys(shifts)
      .sort()
      .map(function (name) {
        return { name: name, n: shifts[name] };
      }),
  };
}
async function nfBroadcastCreate(env, A, body) {
  var b = body.b,
    target = nfBroadcastInput(b),
    dept = body.op === "dept-broadcast",
    d = body.dept || A.u.deptId || "";
  if (dept) {
    if (!d || !deptInScope(A, d) || (A.enf ? !enfHeld(A, d, "notif.dept.broadcast") : !isMgrOf(A, d)))
      throw nfErr("notification-broadcast-permission", 403);
    nfArr(b.emps || [], 20000).forEach(function (x) {
      nfStr(x, 200, false);
    });
  } else if (A.u.role !== "super") throw nfErr("super", 403);
  var id = nfNewId(dept || body.preview ? "n" : "bc"),
    scope = dept ? nfScope(d) : body.preview ? "sys" : "bc",
    kind = scope === "bc" ? "broadcast" : "event",
    count = kind === "broadcast" ? (await nfTargets(env, A, target)).n : 0,
    now = Date.now(),
    m = nfMessage(scope, id, kind, {
      department: dept ? d : "",
      type: dept ? "bc_dept" : "bc_new",
      category: "bc",
      priority: b.lvl || "info",
      channel: "toast",
      title: kind === "broadcast" ? b.title.trim() : (body.preview ? "معاينة تعميم: " : "تعميم: ") + b.title.trim(),
      body: b.body.trim(),
      author_key: String(A.u.ekey || A.u.id),
      author_name: String(A.u.name || A.u.un || ""),
      created_at: b.at && b.at > now ? b.at : now,
      link: b.link || "",
      action_text: b.link ? "افتح " + b.link : "",
      requires_ack: b.ack ? 1 : 0,
      pinned: b.pin ? 1 : 0,
      preview: body.preview ? 1 : 0,
      department_broadcast: dept ? 1 : 0,
      reminders: b.rem ? 1 : 0,
      expires_at: b.expDays ? now + b.expDays * 86400000 : 0,
      scheduled: b.at && b.at > now ? 1 : 0,
      target_mode: kind === "broadcast" ? target.mode : "message",
      recipient_count: count,
    }),
    targets =
      kind === "broadcast"
        ? (target.sel || []).map(function (value) {
            return {
              scope: scope,
              message_id: id,
              kind: { dept: "department", role: "role", shift: "shift", emp: "employee" }[target.mode] || "all",
              value: value,
            };
          })
        : nfTargetRows(scope, id, {
            e: body.preview ? [String(A.u.ekey || A.u.id)] : b.emps || [],
            r: dept && !(b.emps || []).length ? ["all"] : [],
          }),
    st = nfBulk(env, "notification_messages", NF_MESSAGE_COLS, [m]).concat(
      nfBulk(env, "notification_targets", NF_TABLES.targets[1], targets),
    );
  return Object.assign(
    await nfCommit(
      env,
      A,
      st,
      dept ? undefined : body.base,
      dept ? "dept-broadcast" : body.preview ? "preview" : "broadcast",
      undefined,
      dept ? NF_REV : NF_BC_REV,
    ),
    { id: id, n: count },
  );
}
async function nfRemind(env, A, id, base, automatic) {
  var doc = await nfRead(env),
    m = doc.messages.filter(function (x) {
      return x.scope === "bc" && x.id === id;
    })[0];
  if (!m) throw nfErr("notification-not-found", 404);
  if (m.withdrawn_at || m.created_at > Date.now() || (m.expires_at && m.expires_at < Date.now())) return { ok: 1, rev: doc.rev, n: 0 };
  if (automatic && m.reminded_at) return { ok: 1, rev: doc.rev, n: 0 };
  var refs = await nfRefs(env, A),
    ix = nfIndexes(doc),
    targets = ix.targets[nfRef("bc", id)] || [],
    byDept = {};
  (A.users || []).forEach(function (u) {
    if (!u || u.dis || u.role === "super" || !u.deptId || !nfTargetHit(A, m, targets, u, refs)) return;
    var state = ix.states[u.id + "|" + nfRef("bc", id)] || {};
    if (!state.read_at) (byDept[u.deptId] || (byDept[u.deptId] = [])).push(u.ekey || u.id);
  });
  var cfg = nfCfg(doc.overrides),
    T = nfType("bc_rem", cfg),
    st = [],
    n = 0;
  Object.keys(byDept).forEach(function (d) {
    var msg = nfMessage(nfScope(d), nfNewId(), "event", {
      department: d,
      type: "bc_rem",
      category: "bc",
      priority: T.lvl,
      channel: T.chan,
      title: "تذكير بتعميم لم تقرأه",
      body: nfFill(T.txt, { العنوان: m.title }),
      author_key: String(A.u.ekey || A.u.id),
      author_name: String(A.u.name || A.u.un || ""),
      link: "bc:" + id,
      action_text: T.go || "",
    });
    if (T.on) {
      st.push.apply(
        st,
        nfInsertEvent(env, msg, nfTargetRows(msg.scope, msg.id, { e: byDept[d], r: [] }), automatic ? "auto-reminder:" + id : ""),
      );
      n += byDept[d].length;
    }
  });
  if (automatic)
    st.push(
      env.DB.prepare("UPDATE notification_messages SET reminded_at=?1 WHERE scope='bc' AND id=?2 AND reminded_at=0").bind(Date.now(), id),
    );
  return Object.assign(await nfCommit(env, A, st, base === undefined ? doc.broadcastRev : base, "remind", undefined, NF_BC_REV), { n: n });
}
async function nfSecurityPoll(env, A) {
  // A legacy timestamp-only checkpoint means all rows at that timestamp were
  // already consumed. New checkpoints advance the exact (timestamp,id) pair.
  var cp =
      (
        await env.DB.prepare(
          "SELECT name,value FROM notification_checkpoints WHERE scope='sys' AND name IN ('security-ts','security-id')",
        ).all()
      ).results || [],
    timestamp = cp.filter(function (x) {
      return x.name === "security-ts";
    })[0],
    ident = cp.filter(function (x) {
      return x.name === "security-id";
    })[0],
    last = timestamp ? timestamp.value : 0,
    lastId = ident ? ident.value : timestamp ? Number.MAX_SAFE_INTEGER : 0,
    rows =
      (
        await env.DB.prepare("SELECT id,ts,uid,un,act,target,detail,ip FROM sec WHERE ts>?1 OR (ts=?1 AND id>?2) ORDER BY ts,id LIMIT 200")
          .bind(last, lastId)
          .all()
      ).results || [],
    events = [],
    max = last,
    fails = {};
  rows.forEach(function (r) {
    max = Math.max(max, r.ts);
    if (/^tst_/.test(String(r.uid || ""))) return;
    var type = "",
      vars = {};
    if (r.act === "login_fail") {
      var k = r.target || r.un;
      fails[k] = (fails[k] || 0) + 1;
      return;
    }
    if (r.act === "lock" || r.act === "guard_unlock") {
      type = "sc_guard";
      vars = { الفعل: r.act === "lock" ? "قُفل" : "فُكّ", التفصيل: r.detail || "" };
    } else if (r.act === "policy_change") {
      type = "sc_policy";
      vars = { التفصيل: r.detail || "", المُعدّل: r.un || "" };
    } else if (["recovery_key", "recover_ok", "recover_fail"].indexOf(r.act) >= 0) {
      type = "sc_rk";
      vars = {
        الفعل: r.act === "recovery_key" ? "أُنشئ" : "استُخدم",
        IP: r.ip || "",
        النتيجة: r.act === "recover_fail" ? "محاولة فاشلة" : "نجح",
      };
    } else if (r.act === "denied") {
      type = "sc_deny";
      vars = { المفتاح: r.target || "", الاسم: r.un || "", السبب: r.detail || "" };
    } else if (r.act === "acct_add" && /backup|احتياطي/.test(r.detail || "")) {
      type = "sy_bkacc";
      vars = { الفعل: "أُنشئ", المستخدم: r.target || "" };
    }
    if (type) events.push({ type: type, vars: vars, once: "security:" + r.id });
  });
  Object.keys(fails).forEach(function (k) {
    if (fails[k] >= 5)
      events.push({
        type: "sc_fail",
        vars: { العدد: fails[k], الاسم: k, IP: "" },
        once: "fail:" + k + ":" + Math.floor(Date.now() / 600000),
      });
  });
  var finalRow = rows[rows.length - 1],
    extra = [];
  if (finalRow) {
    extra.push(
      env.DB.prepare(
        "INSERT INTO notification_checkpoints(scope,name,value) SELECT 'sys','security-id',?2 WHERE COALESCE((SELECT value FROM notification_checkpoints WHERE scope='sys' AND name='security-ts'),-1)<?1 OR (COALESCE((SELECT value FROM notification_checkpoints WHERE scope='sys' AND name='security-ts'),-1)=?1 AND COALESCE((SELECT value FROM notification_checkpoints WHERE scope='sys' AND name='security-id'),0)<?2) ON CONFLICT(scope,name) DO UPDATE SET value=excluded.value",
      ).bind(finalRow.ts, finalRow.id),
    );
    extra.push(
      env.DB.prepare(
        "INSERT INTO notification_checkpoints(scope,name,value) VALUES('sys','security-ts',?1) ON CONFLICT(scope,name) DO UPDATE SET value=MAX(notification_checkpoints.value,excluded.value)",
      ).bind(finalRow.ts),
    );
  }
  var result = await nfEmitEvents(env, A, events, true, extra);
  var due =
    (
      await env.DB.prepare(
        "SELECT id FROM notification_messages WHERE kind='broadcast' AND reminders=1 AND reminded_at=0 AND withdrawn_at=0 AND created_at<=?1 AND (expires_at=0 OR expires_at>=?2) LIMIT 20",
      )
        .bind(Date.now() - 86400000, Date.now())
        .all()
    ).results || [];
  for (var i = 0; i < due.length; i++) await nfRemind(env, A, due[i].id, undefined, true);
  return result;
}
async function nfAction(env, A, body) {
  var op = body.op;
  if (op === "emit") {
    nfShape(body, ["uid", "op", "type", "dept", "own", "vars", "title", "once", "link", "at"], ["op", "type"]);
    var event = Object.assign({}, body);
    delete event.uid;
    delete event.op;
    return await nfEmitEvents(env, A, [event]);
  }
  if (op === "emit-batch") {
    nfShape(body, ["uid", "op", "events"], ["events"]);
    return await nfEmitEvents(env, A, body.events);
  }
  if (op === "state") return await nfState(env, A, body);
  if (["config", "broadcast", "withdraw", "remind", "targets", "security-poll"].indexOf(op) >= 0 && A.u.role !== "super")
    throw nfErr("super", 403);
  if (op === "targets") {
    nfShape(body, ["uid", "op", "target"], ["target"]);
    return Object.assign({ ok: 1, rev: await nfRevision(env) }, await nfTargets(env, A, body.target));
  }
  if (op === "security-poll") {
    nfShape(body, ["uid", "op"]);
    return await nfSecurityPoll(env, A);
  }
  if (op === "config") {
    nfShape(body, ["uid", "op", "base", "patch", "reset"], ["base"]);
    if (!Number.isSafeInteger(body.base) || body.base < 0) throw nfErr("notification-base");
    var st = [],
      patch = body.patch || {};
    if (body.reset) st.push(env.DB.prepare("DELETE FROM notification_type_overrides"));
    else {
      if (!isObj(patch) || Object.keys(patch).length > 200) throw nfErr("notification-config");
      Object.keys(patch).forEach(function (id) {
        var row = nfOverride(id, patch[id]);
        st.push(env.DB.prepare("DELETE FROM notification_type_overrides WHERE type_id=?1").bind(id));
        if (Object.keys(patch[id]).length) st.push.apply(st, nfBulk(env, "notification_type_overrides", NF_TABLES.overrides[1], [row]));
      });
    }
    return await nfCommit(env, A, st, body.base, "config", undefined, NF_CFG_REV);
  }
  if (op === "broadcast" || op === "dept-broadcast") {
    nfShape(body, ["uid", "op", "base", "b", "preview", "dept"], ["b"]);
    if (op === "broadcast" && (!Number.isSafeInteger(body.base) || body.base < 0)) throw nfErr("notification-base");
    return await nfBroadcastCreate(env, A, body);
  }
  if (op === "withdraw" || op === "remind") {
    nfShape(body, ["uid", "op", "base", "id"], ["base", "id"]);
    nfStr(body.id, 180, false);
    if (!Number.isSafeInteger(body.base) || body.base < 0) throw nfErr("notification-base");
    if (op === "remind") return await nfRemind(env, A, body.id, body.base, false);
    var m = await env.DB.prepare("SELECT id FROM notification_messages WHERE scope='bc' AND id=?1").bind(body.id).first();
    if (!m) throw nfErr("notification-not-found", 404);
    return Object.assign(
      await nfCommit(
        env,
        A,
        [env.DB.prepare("UPDATE notification_messages SET withdrawn_at=?1 WHERE scope='bc' AND id=?2").bind(Date.now(), body.id)],
        body.base,
        "withdraw",
        undefined,
        NF_BC_REV,
      ),
      { n: 1 },
    );
  }
  throw nfErr("notification-operation");
}
async function nfExport(env, A, url) {
  var dept = url.searchParams.get("dept") || "";
  if (
    (!dept && A.u.role !== "super") ||
    (dept && !bkExportOk(A, dept))   /* IP39 (019u): backup.view alone does not export */
  )
    throw nfErr("notification-export-permission", 403);
  if (!dept) {
    var doc = await nfRead(env),
      rev = doc.rev;
    delete doc.rev;
    delete doc.configRev;
    delete doc.broadcastRev;
    return { ok: 1, rev: rev, domain: doc };
  }
  var scope = nfScope(dept),
    out = { version: 1, messages: [], targets: [], states: [], dedup: [], overrides: [], checkpoints: [] },
    names = ["messages", "targets", "states", "dedup"];
  var statements = names.map(function (name) {
    return env.DB.prepare("SELECT * FROM " + NF_TABLES[name][0] + " WHERE " + (name === "states" ? "message_scope" : "scope") + "=?1").bind(
      scope,
    );
  });
  statements.push(env.DB.prepare("SELECT MAX(rev) AS rev FROM revs WHERE k=?1 OR k GLOB 'nf_state:*'").bind(NF_REV));
  var snapshot = await env.DB.batch(statements);
  names.forEach(function (name, i) {
    out[name] = snapshot[i].results || [];
  });
  return { ok: 1, rev: snapshot[names.length].results[0].rev || 0, domain: out };
}
async function nfRoute(env, request, url, ss) {
  if (request.method !== "GET" && request.method !== "POST") return json({ ok: 0, err: "method" }, 405);
  var mismatch = sessUidMismatch(env, url, ss, url.pathname);
  if (mismatch) return mismatch;
  var A = await actorOf(env, ss.uid);
  if (!A || A.u.dis) return json({ ok: 0, err: "session" }, 401);
  try {
    var feedGet = url.pathname === "/api/notifications" && request.method === "GET",
      due = feedGet ? nfDueOpen(env, A, url) : null,
      dueSeen = await nfGuardRetired(env, due ? due.keys : null);
    if (feedGet) {
      var dueJob = nfDueWork(due, dueSeen), ec = env.__ctx;
      if (!dueJob || !ec || typeof ec.waitUntil !== "function") {
        await nfDueRun(env, A, url, dueJob);   /* no execution context: inline, as before */
        return json(await nfFeed(env, A, url));
      }
      var feed = await nfFeed(env, A, url);
      /* decision (h): the due job runs after the feed, off the read's critical path (no D1 trip of the read follows it) */
      ec.waitUntil(Promise.resolve().then(function () { return nfDueRun(env, A, url, dueJob); }).then(null, function (eJ) { swallow("nf-due-job", eJ, env.__rid); }));
      return json(feed);
    }
    if (url.pathname === "/api/notifications/export" && request.method === "GET") return json(await nfExport(env, A, url));
    if (url.pathname !== "/api/notifications/act" || request.method !== "POST") return json({ ok: 0, err: "method" }, 405);
    var bytes = await request.arrayBuffer();
    if (bytes.byteLength > bodyLimit("/api/notifications/act")) throw nfErr("body-large", 413);
    var body;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      return json({ ok: 0, err: "bad-body", at: "$" }, 400);
    }
    var bad = bodyCheck("/api/notifications/act", body);
    if (bad || !isObj(body) || typeof body.op !== "string") return json({ ok: 0, err: "bad-body", at: bad || "$" }, 400);
    if (body.uid != null && String(body.uid) !== String(ss.uid)) return json({ ok: 0, err: "session-changed" }, 409);
    var rl = await rlHit(env, "nf", A.u.id, Math.min(RL_SAVE, 240));
    if (rl) return tooMany(rl);
    return json(await nfAction(env, A, body));
  } catch (e) {
    if (!e.nf) throw e;
    if (e.status === 403) await secLog(env, { uid: A.u.id, act: "denied", target: NF_REV, detail: e.nf });
    return json({ ok: 0, err: e.nf, rev: e.status === 409 ? await nfRevision(env) : undefined }, e.status || 400);
  }
}
/* gateKeys (optional): the shared due-reminder gate stamps are read in the same D1 trip as the retired-source check (decision h). */
async function nfGuardRetired(env, gateKeys) {
  var sql = "SELECT k FROM kv WHERE k IN ('bassam_notif_sys_v1','bassam_bc_v1','bassam_notif_cfg_v1','bassam_notif_v1') OR k GLOB 'bsdept:*:bassam_notif_v1' LIMIT 1",
    seen = nmap(),
    row;
  if (gateKeys && gateKeys.length) {
    var r = await env.DB.batch([
      env.DB.prepare(sql),
      env.DB.prepare("SELECT k,v FROM meta WHERE k IN (SELECT value FROM json_each(?1))").bind(JSON.stringify(gateKeys)),
    ]);
    row = ((r[0] && r[0].results) || [])[0];
    ((r[1] && r[1].results) || []).forEach(function (x) {
      seen[x.k] = String(x.v);
    });
  } else row = await env.DB.prepare(sql).first();
  if (row) throw nfErr("notification-legacy-source-present", 503);
  return seen;
}
/* ═══ RISHAD-266 · owner decision (h) 2026-11-03: the Super/manager notification summary no longer runs the costly due jobs
   (nfIrshadDaily · nfSeizedDue) on every GET /api/notifications. Measured on fa74283: 11–15 D1 trips per read from 06:00 to
   21:00 UTC (the 7-trip budget only held at night) because every open/reload reloaded the scoped resources and re-queried dedup.
   Now one shared gate per job and department, the existing isolate-shared task-gate pattern (074 tkg:<kind>:<dept> rows in meta,
   isolate memory first): ird = Irshad daily, szd = Seized due.
   · cost: isolate memory first (0 trips); otherwise the stamps are read in the same trip as the retired-source check (0 extra
     trips). When a job is due it runs OFF the read's critical path: after the feed is built, under the runtime's execution
     context (ctx.waitUntil, as the 054 session heartbeat), so the summary read itself stays within its 7-trip budget at every
     hour; the reminder is visible from the next read. Without an execution context (local tools) it runs inline as before.
   · never lost: a stamp holds at most NF_DUE_GAP while a job has nothing (yet) to emit, and never across one of the job's due
     edges (Irshad daily: Riyadh 00:00 · 23:30; Seized due: 00:00 · 08:00 · 09:00), nor across a restore epoch; so a reminder that
     becomes due is emitted on the first eligible read after its due time, or within NF_DUE_GAP when its source data arrives
     later. Catch-up at the window close (Riyadh midnight, where the once key changes): when the previous day's last check inside
     the window was not settled through its close, the first eligible run after the close re-checks that window once, at its
     close instant (same once key ⇒ still deduplicated); data landing in the final NF_DUE_GAP before midnight is not lost.
     A job that is settled (every once key of the current window already in notification_dedup) holds until the next edge.
   · stamped after the job, not before: an actor who cannot run the job (no scope/role → no `checked`) or a job that throws
     leaves no stamp, so it cannot suppress another manager's reminder; concurrent runs stay deduplicated by the unchanged
     once keys and SEEN guards in the jobs (never duplicated), and every job write keeps its legacy-source/epoch guards.
   · stamp value "<from>:<until>:<restore epoch>:<settled 0|1>"; written through __rawDB with the task-gate statement shape
     (cache neutral, 052). Isolate memory {e: epoch, q: quiet-until, v: stamp} only skips the stamp read, never decides a run. */
var NF_DUE_GAP = 5 * 6e4, NF_DUE_DAY = 864e5, NF_DUE_MEM = nmap(), NF_DUE_EDGES = { ird: [0, 1410], szd: [0, 480, 540] };
function nfDueDay(now) { return Math.floor((now + 3 * 3600000) / NF_DUE_DAY) * NF_DUE_DAY - 3 * 3600000; }   /* Riyadh 00:00 */
function nfDueSpan(k, now) {
  var start = nfDueDay(now), m = (now - start) / 6e4, last = 0, next = 1440;
  NF_DUE_EDGES[k].forEach(function (b) {
    if (b <= m) last = b;
    else if (b < next) next = b;
  });
  return { last: start + last * 6e4, next: start + next * 6e4 };
}
/* the jobs' own time windows (019j · 019n) */
function nfDueIn(k, ts) {
  var m = pfRiyadhMins(ts);
  return k === "ird" ? m >= 1410 : m >= 540 || (m >= 480 && new Date(ts + 3 * 3600000).getUTCDay() === 6);
}
function nfDueStamp(v, now, epoch) {
  var p = /^(\d+):(\d+):(\d+):([01])$/.exec(v == null ? "" : String(v));
  if (!p || p[3] !== epoch || +p[1] > now + TK_GATE_SKEW) return null;
  return { from: +p[1], until: +p[2], settled: p[4] === "1" };
}
/* what kind k needs now, given its shared stamp: catchUp = the previous window's close instant (re-check once), run = check now */
function nfDuePlan(k, s, now) {
  var close = nfDueDay(now), span = nfDueSpan(k, now),
    held = !!(s && s.from >= span.last && now < s.until),
    catchUp = s && s.from < close && s.from >= close - NF_DUE_DAY && nfDueIn(k, s.from) && !(s.settled && s.until >= close) ? close - 1 : 0,
    run = nfDueIn(k, now) && !held ? 1 : 0;
  return { k: k, catchUp: catchUp, run: run, quiet: catchUp || run ? 0 : held ? s.until : span.next };
}
function nfDueOpen(env, A, url) {
  var now = Date.now(), d = url.searchParams.get("dept") || "", epoch = String(env.__restoreEpoch || 0);
  if (!d || !irDailyManager(A)) return null;
  var kinds = ["ird", "szd"].filter(function (k) {
    var m = NF_DUE_MEM["tkg:" + k + ":" + d];
    return !(m && m.e === epoch && now < m.q);
  });
  return kinds.length ? { d: d, now: now, epoch: epoch, kinds: kinds, keys: kinds.map(function (k) { return "tkg:" + k + ":" + d; }) } : null;
}
/* decide from the shared stamps (no I/O); a kind with nothing to do is remembered as quiet in this isolate */
function nfDueWork(due, seen) {
  if (!due) return null;
  var work = [];
  due.kinds.forEach(function (k, i) {
    var key = due.keys[i], m = NF_DUE_MEM[key], v = seen[key] != null ? seen[key] : m && m.e === due.epoch ? m.v : null,
      p = nfDuePlan(k, nfDueStamp(v, due.now, due.epoch), due.now);
    if (p.catchUp || p.run) { p.key = key; work.push(p); }
    else NF_DUE_MEM[key] = { e: due.epoch, q: p.quiet, v: v };
  });
  return work.length ? { due: due, work: work } : null;
}
async function nfDueRun(env, A, url, job) {
  if (!job) return;
  var due = job.due;
  for (var i = 0; i < job.work.length; i++) {
    var p = job.work[i], fn = p.k === "ird" ? nfIrshadDaily : nfSeizedDue, rc = null, r = null;
    if (p.catchUp) { rc = await fn(env, A, url, p.catchUp); if (rc.emitted) preOff(env); }   /* the previous window, at its close */
    if (p.run) { r = await fn(env, A, url); if (r.emitted) preOff(env); }
    if ((rc && !rc.checked) || (r && !r.checked)) continue;
    var span = nfDueSpan(p.k, due.now),
      until = r && !r.settled ? Math.min(due.now + NF_DUE_GAP, span.next) : span.next,
      v = due.now + ":" + until + ":" + due.epoch + ":" + (r && !r.settled ? 0 : 1);
    NF_DUE_MEM[p.key] = { e: due.epoch, q: until, v: v };
    try {
      await (env.__rawDB || env.DB).prepare("INSERT INTO meta (k, v) VALUES (?2, ?1) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(v, p.key).run();
    } catch (e) { swallow("nf-due-stamp", e, env.__rid); }   /* no shared stamp ⇒ other isolates simply run the job (the old behaviour) */
  }
}

async function nfFeed(env, A, url) {
  for (var attempt = 0; attempt < 3; attempt++) {
    var out = await nfFeedOnce(env, A, url);
    var revisions = await nfFeedRevisions(env, A);
    out.configRev = revisions.config;
    out.broadcastRev = revisions.broadcast;
    if (out.rev === revisions.feed) return out;
  }
  throw nfErr("conflict", 409);
}
