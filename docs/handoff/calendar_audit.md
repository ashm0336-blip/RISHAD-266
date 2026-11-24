# جرد مواضع التاريخ في المنصة (قبل التقويم) — للتحقق بعده

> المصدر: مسح آلي لفرع `claude/v7-d7` في 24 نوفمبر (قبل دمج التقويم): كل ملف فيه دالة تقويم هجري، أو اسم شهر هجري، أو «هـ»، أو أعمدة `hijri_*`، أو تنسيق تاريخ. **شرط القبول:** بعد دمج التقويم يُعاد المسح، وكل موضع يعرض تاريخاً للمستخدم يكون **ميلادياً أساساً وما يقابله بالهجري (أم القرى)**، أو مذكوراً هنا سببُ بقائه (مثل: السجلات القديمة كما كُتبت — ق9).

**المجموع:** 112 ملفاً · 1741 موضعاً.

| المجال | الملف | المواضع |
|---|---|---|
| الخادم (workers) | `workers/parts/014-identity-migration-2.js` | 1 |
| الخادم (workers) | `workers/parts/016-base-shared.js` | 16 |
| الخادم (workers) | `workers/parts/019-notifications.js` | 2 |
| الخادم (workers) | `workers/parts/019c-employee-transition.js` | 1 |
| الخادم (workers) | `workers/parts/019d-atomic-restore.js` | 6 |
| الخادم (workers) | `workers/parts/019f-backup-converter.js` | 6 |
| الخادم (workers) | `workers/parts/019g-backup-import.js` | 1 |
| الخادم (workers) | `workers/parts/019p0-scheduling-base.js` | 1 |
| الخادم (workers) | `workers/parts/047-retro.js` | 1 |
| الخادم (workers) | `workers/parts/048-permv4.js` | 1 |
| الخادم (workers) | `workers/parts/051a-schema-migrations.js` | 56 |
| الخادم (workers) | `workers/parts/054-image-contract.js` | 3 |
| الخادم (workers) | `workers/parts/059-protected-ops-2.js` | 1 |
| الخادم (workers) | `workers/parts/062b-me-history.js` | 11 |
| الخادم (workers) | `workers/parts/063-enf-api-and-handler.js` | 5 |
| الصفحة: Admin | `src/pages/Admin.dc.html` | 19 |
| الصفحة: Award | `src/pages/Award.dc.html` | 7 |
| الصفحة: Daily Report | `src/pages/Daily Report.dc.html` | 37 |
| الصفحة: Daily Sessions | `src/pages/Daily Sessions.dc.html` | 77 |
| الصفحة: Daily Stats | `src/pages/Daily Stats.dc.html` | 44 |
| الصفحة: Employees | `src/pages/Employees.dc.html` | 76 |
| الصفحة: Irshad | `src/pages/Irshad.dc.html` | 46 |
| الصفحة: Operational Plan | `src/pages/Operational Plan.dc.html` | 26 |
| الصفحة: Org | `src/pages/Org.dc.html` | 2 |
| الصفحة: Profile | `src/pages/Profile.dc.html` | 24 |
| الصفحة: Rasd | `src/pages/Rasd.dc.html` | 38 |
| الصفحة: Seized | `src/pages/Seized.dc.html` | 47 |
| الصفحة: Staffing | `src/pages/Staffing.dc.html` | 19 |
| الصفحة: Tasks | `src/pages/Tasks.dc.html` | 73 |
| النظام: _shared | `src/systems/_shared/kpiring/kpi-ring.js` | 1 |
| النظام: _shared | `src/systems/_shared/print/566-print-core.js` | 10 |
| النظام: award | `src/systems/award/client/logic.js` | 7 |
| النظام: award | `src/systems/award/client/view.html` | 1 |
| النظام: award | `src/systems/award/server/019m-award.js` | 1 |
| النظام: custody | `src/systems/custody/server/019a-custody.js` | 21 |
| النظام: custody | `src/systems/custody/server/019a2-custody-resolve.js` | 2 |
| النظام: custody | `src/systems/custody/server/019a4-custody-api.js` | 28 |
| النظام: custody | `src/systems/custody/server/019b2-custody-cleanup.js` | 12 |
| النظام: custody | `src/systems/custody/slots/emp.logic.custody.frag` | 36 |
| النظام: daily | `src/systems/daily/client/421-round-links.js` | 2 |
| النظام: daily | `src/systems/daily/client/520-field-monitor.js` | 4 |
| النظام: daily | `src/systems/daily/client/logic.js` | 77 |
| النظام: daily | `src/systems/daily/server/019p3-scheduling-rounds.js` | 3 |
| النظام: dreport | `src/systems/dreport/client/logic.js` | 36 |
| النظام: dreport | `src/systems/dreport/client/view.html` | 1 |
| النظام: dstats | `src/systems/dstats/client/580-historical-import.js` | 1 |
| النظام: dstats | `src/systems/dstats/client/logic.js` | 42 |
| النظام: dstats | `src/systems/dstats/client/view.html` | 2 |
| النظام: dstats | `src/systems/dstats/server/020-dstats.js` | 32 |
| النظام: dstats | `src/systems/dstats/slots/bc.convert.dstats.frag` | 6 |
| النظام: dstats | `src/systems/dstats/slots/rs.plan.dstats.frag` | 6 |
| النظام: irshad | `src/systems/irshad/client/logic.js` | 45 |
| النظام: irshad | `src/systems/irshad/client/view.html` | 1 |
| النظام: irshad | `src/systems/irshad/permissions.json` | 1 |
| النظام: irshad | `src/systems/irshad/server/019g-irshad-domain.js` | 6 |
| النظام: irshad | `src/systems/irshad/server/019h-irshad-query.js` | 48 |
| النظام: irshad | `src/systems/irshad/server/019i-irshad-operations.js` | 2 |
| النظام: irshad | `src/systems/irshad/server/019j-irshad-daily.js` | 4 |
| النظام: plan | `src/systems/plan/client/logic.js` | 26 |
| النظام: plan | `src/systems/plan/slots/p1b.slots.json` | 1 |
| النظام: rasd | `src/systems/rasd/client/logic.js` | 38 |
| النظام: rasd | `src/systems/rasd/client/view.html` | 1 |
| النظام: rasd | `src/systems/rasd/permissions.json` | 1 |
| النظام: seized | `src/systems/seized/client/logic.js` | 46 |
| النظام: seized | `src/systems/seized/client/view.html` | 1 |
| النظام: seized | `src/systems/seized/server/019l-seized-dashboard.js` | 33 |
| النظام: seized | `src/systems/seized/server/019l-seized-operations.js` | 3 |
| النظام: seized | `src/systems/seized/server/019l-seized-query.js` | 10 |
| النظام: seized | `src/systems/seized/server/019l-seized.js` | 3 |
| النظام: seized | `src/systems/seized/server/019n-seized-due.js` | 1 |
| النظام: staff | `src/systems/staff/client/530-emp-day-facts.js` | 5 |
| النظام: staff | `src/systems/staff/client/logic.js` | 19 |
| النظام: tasks | `src/systems/tasks/client/logic-actions.js` | 1 |
| النظام: tasks | `src/systems/tasks/client/logic-adv.js` | 1 |
| النظام: tasks | `src/systems/tasks/client/logic-kpi.js` | 15 |
| النظام: tasks | `src/systems/tasks/client/logic-picker.js` | 1 |
| النظام: tasks | `src/systems/tasks/client/logic-prod.js` | 1 |
| النظام: tasks | `src/systems/tasks/client/logic-proof.js` | 2 |
| النظام: tasks | `src/systems/tasks/client/logic-recur.js` | 4 |
| النظام: tasks | `src/systems/tasks/client/logic.js` | 48 |
| النظام: tasks | `src/systems/tasks/server/070-task-core.js` | 7 |
| النظام: tasks | `src/systems/tasks/server/070b-task-rows.js` | 2 |
| النظام: tasks | `src/systems/tasks/server/071-task-mgmt.js` | 4 |
| النظام: tasks | `src/systems/tasks/server/072-task-elig.js` | 2 |
| النظام: tasks | `src/systems/tasks/server/073-task-recur.js` | 11 |
| النظام: tasks | `src/systems/tasks/server/074-task-due.js` | 1 |
| النظام: tasks | `src/systems/tasks/slots/profile.methods.2.tasks.frag` | 4 |
| النواة: api | `src/api/280-server-storage.js` | 4 |
| النواة: auth | `src/auth/335-identity-gate.js` | 1 |
| النواة: blocks.json | `src/blocks.json` | 1 |
| النواة: components | `src/components/555-page-states.js` | 8 |
| النواة: components | `src/components/565-page-kit.js` | 35 |
| النواة: core | `src/core/005-kivo-ns.js` | 1 |
| النواة: core | `src/core/040-intl-cache.js` | 7 |
| النواة: i18n | `src/i18n/120-arabic-digits.js` | 1 |
| النواة: i18n | `src/i18n/380-hijri-fallback.js` | 5 |
| النواة: i18n | `src/i18n/385-calendar.js` | 97 |
| النواة: layouts | `src/layouts/260-bassam-plat.js` | 4 |
| النواة: layouts | `src/layouts/root-logic.js` | 1 |
| النواة: permissions | `src/permissions/331-perm-model.js` | 1 |
| النواة: services | `src/services/060-percent-format.js` | 1 |
| النواة: services | `src/services/290-activity-log.js` | 15 |
| النواة: services | `src/services/440-count.js` | 1 |
| النواة: services | `src/services/441-notif-core.js` | 14 |
| النواة: services | `src/services/442-notif-observer.js` | 3 |
| النواة: services | `src/services/535-profile-facts.js` | 22 |
| النواة: services | `src/services/570-bassam-xlsx.js` | 1 |
| النواة: services | `src/services/590-employees-import.js` | 18 |
| الوحدة: admin | `src/modules/admin/logic.js` | 20 |
| الوحدة: employees | `src/modules/employees/logic.js` | 77 |
| الوحدة: org | `src/modules/org/logic-perm44.js` | 2 |
| الوحدة: profile | `src/modules/profile/logic.js` | 24 |

## أسطح العرض التي يجب أن تُفحص يدوياً (حيث يرى المستخدم تاريخاً)
| السطح | أين |
|---|---|
| كروت اليوم/الشهر/السنة | كل الأنظمة الأحد عشر + النواة |
| عناوين الصفحات والشهر المعروض | كل الأنظمة الأحد عشر + النواة |
| الفلاتر واختيار الفترة (من–إلى) | كل الأنظمة الأحد عشر + النواة |
| الجداول وأعمدة التاريخ | كل الأنظمة الأحد عشر + النواة |
| التلميحات | كل الأنظمة الأحد عشر + النواة |
| النوافذ (فتح/قفل/اعتماد) ونصوصها | كل الأنظمة الأحد عشر + النواة |
| التنبيهات والجرس ونصوصها | كل الأنظمة الأحد عشر + النواة |
| «صفحتي» ومهامي | كل الأنظمة الأحد عشر + النواة |
| مؤشرات الإدارة والفترات والمقارنات | كل الأنظمة الأحد عشر + النواة |
| تقارير PDF والغلاف والترويسة | كل الأنظمة الأحد عشر + النواة |
| تصدير Excel وCSV | كل الأنظمة الأحد عشر + النواة |
| سجل الحركة والتدقيق (القديم يبقى كما كُتب — ق9) | كل الأنظمة الأحد عشر + النواة |
| الاستيراد من Excel ومن ملف Production | كل الأنظمة الأحد عشر + النواة |
| النسخ الاحتياطية والاستعادة | كل الأنظمة الأحد عشر + النواة |
| شاشة الدخول والجلسات والأجهزة | كل الأنظمة الأحد عشر + النواة |
| المساعدة والنصوص الإرشادية | كل الأنظمة الأحد عشر + النواة |
