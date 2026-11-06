# سجلُّ المسارات — KIVO (مولَّد: `python3 tools/route_registry.py --write` — لا يُحرَّر يدوياً)

> SOT-095: «كل route له page owner, guard, title, nav behavior» · الغلافُ يقبل هذه المسارات وحدها (`src/layouts/root-logic.js` `_pageAllowed`) — 
> وما لا يمرّ بحارسه يرتدّ إلى أول صفحةٍ متاحة أو «صفحتي». الخادمُ يحرس البيانات نفسَها بالمفاتيح (`docs/api.md`) — الحارسُ هنا حارسُ العرض.

| المسار | العنوان | مفتاحُ الصفحة | الوحدةُ المالكة | الحارس | سلوكُ التنقّل | التبويبات/الفروع |
|---|---|---|---|---|---|---|
| `#/dstats` | الإحصائيات اليومية | `dstats` | `dstats` | P.can("dstats","view") ⇐ dstats.anCmp.view، dstats.anHaram.view، dstats.anNabawi.view، dstats.anTime.view، dstats.haram.view، dstats.nabawi.view | في القائمة · العنوانُ يحمل #/dstats/haram · #/dstats/nabawi | `anHaram` · `anNabawi` · `anCmp` · `anTime` · `haram` · `nabawi` |
| `#/employees` | موظفو الإدارة | `emps` | `employees` | P.can("emps","view") ⇐ cust.view، emp.view، ref.custody_type.view، ref.employment_type.view | في القائمة · العنوانُ يحمل التبويب #/employees/<تبويب> | `data` · `custody` |
| `#/planning` | الخطة التشغيلية | `planning` | `planning` | P.can("planning","view") ⇐ ready.view | في القائمة | `readiness` |
| `#/staffing` | الجدول الشهري | `staff` | `staff` | P.can("staff","view") ⇐ ref.callsign.view، ref.work_type.view، staff.view | تحت «الخطة التشغيلية» | — |
| `#/plan` | التشغيل الميداني | `plan` | `plan` | P.can("plan","view") ⇐ plan.view | تحت «الخطة التشغيلية» | — |
| `#/daily` | المتابعة اليومية | `daily` | `daily` | P.can("daily","view") ⇐ field.view، round.view | في القائمة · العنوانُ يحمل #/daily/rounds · #/daily/dreport · #/daily/tasks | `kpiDaily` · `kpiOcc` · `kpiZones` · `rounds` · `field` |
| `#/dreport` | التقرير اليومي | `dreport` | `dreport` | P.can("dreport","view") ⇐ ref.leave_type.view، report.indicators.view، report.view | تحت «المتابعة اليومية» | — |
| `#/tasks` | المهام | `tasks` | `tasks` | P.can("tasks","view") ⇐ task.view | تحت «المتابعة اليومية» | — |
| `#/irshad` | نظام الاسترشاد | `irshad` | `irshad` | P.can("irshad","view") ⇐ ir.dash.view، ir.rec.view، ref.irshad.language.view، ref.irshad.location.view | في القائمة · العنوانُ يحمل #/irshad/records | `dash` · `records` |
| `#/seized` | نظام المضبوطات | `seized` | `seized` | P.can("seized","view") ⇐ ref.seized.action.view، ref.seized.category.view، ref.seized.item.view، ref.seized.kind.view، ref.seized.location.view، sz.dash.view … | في القائمة · العنوانُ يحمل #/seized/records | `dash` · `records` |
| `#/award` | جائزة التميز | `award` | `award` | P.can("award","view") ⇐ award.doc.view، award.new.view، award.res.view | في القائمة · العنوانُ يحمل التبويب #/award/<تبويب> | `new` · `res` · `doc` |
| `#/links` | مواقع ذات صلة | `links` | `shell (src/layouts)` | ورقةُ الصفحة «links» (P.can("links","view")) — links.view | رابطٌ في التذييل/القائمة الثانوية | — |
| `#/help` | المساعدة | `help` | `shell (src/layouts)` | ورقةُ الصفحة «help» (P.can("help","view")) — help.view | رابطٌ في التذييل/القائمة الثانوية | — |
| `#/admin` | الإعدادات | `admin` | `admin` | P.can("admin","view") ⇐ audit.view، backup.view، import.view، tpl.view | رابطٌ في التذييل/القائمة الثانوية · العنوانُ يحمل التبويب #/admin/<تبويب> | `backup` · `oplog` · `shifts` · `ptpls` · `import` |
| `#/profile` | صفحتي | `profile` | `profile` | كلُّ صاحب جلسة (الصفحةُ الشخصية · المرتدُّ الأخير) | خارج القائمة — من قائمة المستخدم | — |
| `#/sysadmin` | مركز إدارة رشاد | `sysadmin` | `admin` | مسؤول المنصة وحده (isSuper) — وإلا لا يُفتح | من القائمة الجانبية «🛡 مركز إدارة رشاد» · #/sysadmin/<تبويب> | — |
| `#/kpis` | مؤشرات الإدارة | `kpis` | `kpis` | من يملك ورقةً من أوراق لوحاتها (navLeaves("kpis") · kpiPanelOk) — مدير النظام دائماً | حاويةُ عرضٍ في القائمة (navOrder) | — |
