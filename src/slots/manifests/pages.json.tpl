{
 "version": 1,
 "generated": "tools/generate.py → manifests/255-page-manifest.js + PG_REG في الخادم",
 "notes": [
  "سجل الصفحات — المصدر الوحيد لمنظومة الصلاحيات والتوجيه والقائمة الجانبية: أي صفحة جديدة تُضاف هنا فقط، فتدخل تلقائياً في سقوف الإدارات وحارس التنقّل وإخفاء الرابط (key = مفتاح الصلاحية · nav = مفتاح التنقّل · name = الاسم المعروض).",
  "subs = التبويبات الداخلية للصفحة (تُعلَن هنا لأن لا سبيل لاكتشافها آلياً) · tabs = أوراق لكل منها أفعالها · offPage = ورقة لا تفتح صفحتها (مكانها في الشجرة فقط) · under = صفحة تسكن حاوية (تبويب فيها) · seq = ترتيب الأوراق في الشجرة · tabLabel = عنوان مجموعة التبويبات · subStore = مخزن الاختيارات (lenses = مخزن العدسات القائم).",
  "containers (NAV_REG) = روابط قائمة بلا مفتاح صلاحية: أوراقها هي أوراق صفحاتها بمفاتيحها نفسها (refs) — لا مفتاح جديد ولا خطوة ترحيل؛ names = أسماء الأوراق داخل الحاوية.",
  "lenses = عدسات الخريطة (المناطق ثابتة لا تدخل القائمة) · tabAddr = الصفحات التي لتبويباتها عناوين #/page/tab · navOrder/navNames = ترتيب وأسماء روابط المجموعة الأولى في القالب (nth-of-type) · routeNames = أسماء المسارات للعنوان (ومنها sysadmin/profile خارج السجل).",
  "الخادم يستهلك البنية وحدها (PG_REG: key · subs · tabs · off · under) ويُولَّد من هذا الملف نفسه؛ الواجهة تأخذ نسخاً عميقة (clone) كما كانت أدبياتها مستقلة.",
  "KIVO_261 (SOT-003 · 1:1 مع المنصة): كلُّ لوحةٍ يعرضها «مؤشرات الإدارة» وحده (refs الحاوية kpis) ورقةٌ offPage — لا تفتح صفحتَها (لا تظهر هناك أصلاً: الاسترشادُ والمضبوطاتُ ولوحاتُ المتابعة والجاهزيةُ تُستورد solo)، فمنحُها وحدها يُظهر «مؤشرات الإدارة» لا صفحةً فارغة. القاعدةُ يفحصها k261tree.",
  "CORE-01 (عقدُ تعريف النظام — يصل الواجهةَ منذ V7 P4 لتُشتقّ منه خريطةُ الأنظمة و«الوحدات» وشروطُ اللوحات؛ الخادمُ يأخذ البنيةَ وحدها): module = slug الوحدة في modules/modules.json (ميثاقُها meta.json) · activation = toggle (يطفئها mods.off · ff.module.<key>.enabled) أو always (لا تُطفأ) · requires = [{for: ورقة offPage، on: صفحة أو lens:<عدسة>، kind: perm|lens|code}] — يطابقها tools/validate_schemas.py مع الشيفرة (331 · admin/logic · 334 kpiPanelOk · dc-import). الشرحُ docs/modules.md.",
  "V7 P4: مرجعٌ بلا «/» في refs الحاوية = لوحةٌ تملكها صفحةٌ كاملة ويمنحها مفتاحُ عرضها نفسُه (tasks = «مؤشرات المهام» لمن يملك عرضَ المهام) — لا ورقةَ ولا مفتاحَ جديداً · platSwitch = للوحدة مفتاحُ إطفاءٍ في «المنصة ← الوحدات» اليوم · platLock = سببُ قفلها هناك (وحدةٌ toggle لا تُطفأ من الواجهة). ما لا يحمل أيَّهما يُعرض بلا مفتاح."
 ],
 "pages": [
@@SYS:pages.entry.dstats@@  {
   "key": "emps",
   "module": "employees",
   "activation": "toggle",
   "platLock": "أساسية: حسابات المنصة وبيانات الوحدات تقوم عليها — فصلُها شأنُ مشروع الهيكلة",
   "departmentComponents": ["Employees"],
   "nav": "employees",
   "name": "موظفو الإدارة",
@@SYS:pages.emps.shellTabs@@   "seq": [
    "sub:data"@@SYS:pages.emps.seq.custody@@
   ],
   "subs": [
    {
     "key": "data",
     "name": "بيانات الموظفين"
    }@@SYS:pages.emps.subs.custody@@
   ]
  },
  {
   "key": "planning",
   "module": "planning",
   "activation": "toggle",
   "platSwitch": true,
   "requires": [
    {"for": "planning/readiness", "on": "emps", "kind": "code"}
   ],
   "departmentComponents": ["Planning"],
   "nav": "planning",
   "name": "الخطة التشغيلية",
   "seq": [
    "sub:readiness"@@SYS:pages.planning.seq|sep=",\n"|pre=",\n"@@
   ],
   "subs": [
    {
     "key": "readiness",
     "name": "مؤشرات الجاهزية",
     "offPage": true
    }
   ]
  },
@@SYS:pages.entry.staff@@@@SYS:pages.entry.plan@@@@SYS:pages.entry.daily@@@@SYS:pages.entry.dreport@@@@SYS:pages.entry.tasks@@@@SYS:pages.entry.systems@@  {
   "key": "links",
   "activation": "toggle",
   "nav": "links",
   "name": "مواقع ذات صلة"
  },
  {
   "key": "help",
   "activation": "toggle",
   "nav": "help",
   "name": "المساعدة"
  },
  {
   "key": "admin",
   "module": "admin",
   "activation": "always",
   "nav": "admin",
   "name": "الإعدادات",
   "subs": [
    {
     "key": "backup",
     "name": "النسخة الاحتياطية"
    },
    {
     "key": "oplog",
     "name": "سجل الحركة"
    },
    {
     "key": "shifts",
     "name": "الورديات"
    },
    {
     "key": "ptpls",
     "name": "قوالب الصلاحيات",
     "noTab": true
    },
    {
     "key": "import",
     "name": "استيراد بيانات",
     "noTab": true
    }
   ]
  }
 ],
 "containers": [
  {
   "key": "kpis",
   "nav": "kpis",
   "name": "مؤشرات الإدارة",
   "refs": [
    "planning/readiness"@@SYS:pages.kpi.refs.daily@@@@SYS:pages.kpi.refs.mid@@@@SYS:pages.kpi.refs.tasks@@@@SYS:pages.kpi.refs.tail@@
   ],
   "names": {
    "planning/readiness": "مؤشرات الجاهزية"@@SYS:pages.kpi.names.daily@@@@SYS:pages.kpi.names.mid@@@@SYS:pages.kpi.names.tasks@@@@SYS:pages.kpi.names.tail@@
   }
  }
 ],
 "tabAddr": {
  "emps": 1,
@@SYS:pages.tabAddr.award@@  "admin": 1@@SYS:pages.tabAddr.daily.entry@@@@SYS:pages.tabAddr.tail@@
 },
 "navOrder": [
  "kpis",
@@SYS:pages.navOrder.dstats@@  "emps",
  "planning"@@SYS:pages.navOrder.daily@@@@SYS:pages.navOrder.tail@@
 ],
 "navNames": {
  "kpis": "مؤشرات الإدارة",
@@SYS:pages.navNames.dstats@@  "emps": "موظفو الإدارة",
  "planning": "الخطة التشغيلية"@@SYS:pages.navNames.daily@@@@SYS:pages.navNames.tail@@
 },
 "routeNames": {
  "kpis": "مؤشرات الإدارة",
@@SYS:pages.routeNames.dstats@@  "employees": "موظفو الإدارة",
@@SYS:pages.routeNames.staff@@@@SYS:pages.routeNames.plan@@  "planning": "الخطة التشغيلية",
@@SYS:pages.routeNames.daily@@@@SYS:pages.routeNames.dreport@@@@SYS:pages.routeNames.tasks@@@@SYS:pages.routeNames.systems@@  "links": "مواقع ذات صلة",
  "help": "المساعدة",
  "admin": "الإعدادات",
  "sysadmin": "مركز إدارة رشاد",
  "profile": "صفحتي"
 }
}
