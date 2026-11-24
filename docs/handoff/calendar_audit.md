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

## V7 · 53 تقويم — إعادة المسح بعد التحويل: ملفات cal-ops (الجولات · التقرير اليومي · الخطة · الجدول الشهري · المهام · صفحتي) — REVIEW 22
المسح: أسماءُ الدوال الهجرية (`hParts/hGreg*/hToday/hText/hijriAt/pfHijriAt/calHijri*/dsToday`، `islamic-umalqura`) · أسماءُ الأشهر الهجرية · «هـ» · أعمدة `hijri_*` · تنسيقُ التاريخ (`toLocaleDateString` · `ar-SA`). لا عمودَ `hijri_*` في أيٍّ منها.

| الملف | صار ميلادياً + سطر أم القرى | بقي هجرياً (والسبب المسموح) |
|---|---|---|
| plan `client/logic.js` | كرتُ الشهر المشترك · «آخر حركة» ميلادي ثم «الموافق … هـ» · شرائحُ الأدوار باسم الشهر الميلادي المعروض (كانت «محرم» ثابتة) | — |
| daily `client/logic.js.tpl` · dreport `client/logic.js` | كروتُ اليوم والشهر المشتركة؛ `ar-SA` لاسم اليوم والساعة وحدهما | — |
| staff `client/logic.js` | كرتُ الشهر؛ اسمُ اليوم والساعة وحدهما | سطرا تقرير ق4 `H(q.ha)`/`H(q.hb)`: يسمّيان **الشهرين الهجريين المصدر** للتعارض — سجلُّ ترحيلٍ كما كُتب (ق9) |
| tasks `client/logic.js` · `logic-actions.js` | رأسُ كرت اليوم «مهام يوم … 20 أكتوبر 2026» وتحته «الموافق 9 جمادى الأولى 1448 هـ» · «الشهر كاملاً» ومدى الشهر الهجري · تاريخُ سجل الإجراء ميلادي · هجري | — |
| tasks `client/logic-proof.js` · `slots/profile.methods.2.tasks.frag` | ختمُ صورة الإثبات: ميلادي ثم هجري ثم الساعة (كان هجرياً وحده) | — |
| tasks `server/070b` · `slots/nfo.watch.*.frag` | الساعة وحدها | نصوصُ الإشعارات المرسَلة سابقاً تبقى كما كُتبت |
| profile `logic.js(.tpl)` · `062b-me-history` · `535-profile-facts` | المفاتيحُ والمنطق على `pfDayAt` (ISO) · سطرُ التاريخ ميلادي + `hDayText` | `PF_HF` (أم القرى) لـ`pfHOf` وحده: سطرُ العرض الهجري تحت الميلادي — لا مفاتيح ولا منطق |
| `280-server-storage` · `332-find-day` · `590-employees-import` | فتراتٌ ومفاتيحُ ISO · منتقي الشهر ميلادي | — |
| الصفحاتُ المبنية الست (`*.dc.html`) | كمصادرها أعلاه | الحزمةُ تضم 385 (خدمةُ التقويم نفسُها: `hText` و`H_MONTHS`) |

النتيجة: لا عرضَ هجرياً وحده في ملفات cal-ops؛ الهجريُّ الباقي سطرُ العرض التابع وسجلاتُ الترحيل القديمة كما كُتبت. خارجَ cal-ops: `566-print-core` (ف٨: غلافُ «لعام 1448هـ» وسطورُ الجولة) و`441-notif-core monLbl` — عند مالكيهما.

أحجامُ الصفحات (`perf_budget pk265`): التقرير اليومي 51,768 / 54,585 (5.16 %) · المتابعة اليومية 237,720 / 248,394 (4.30 %) · الخطة التشغيلية 230,182 / 241,234 (4.58 %) · التخطيط 2,979 / 3,250 (8.34 %) · صفحتي 56,277 / 70,000 (19.60 %) · الجدول الشهري 39,473 / 41,921 (5.84 %) · المهام 85,657 / 90,000 (4.83 %).

## V7 · 53 تقويم — إعادة المسح الموحّدة على الشجرة النهائية (integ @ 616f9042 + إصلاحات العيوب الأربعة) — REVIEW 22 (قبولُ تسليم الشركة)

**المسح:** أداةُ المسح الأصلي ليست في المستودع، فأُعيد بناؤها بالنمط المعلن في رأس هذا الملف: أسماءُ دوال التقويم الهجري (`hijri*` · `islamic`/`umalqura` · `hParts/hToday/hText/hOf/hDayText/hNow/hRange` · `H_MONTHS`)، وأسماءُ الأشهر الهجرية، و«هـ»، وتنسيقُ التاريخ (`toLocaleDateString` · `toLocaleString` · `Intl.DateTimeFormat` · `ar-SA`)، مع عدّ كل مطابقة. المجالُ هو `src` و`workers`، ولا يدخله `src/slots` (القوالب) ولا الاختبارات. الأداةُ والنتائجُ الخام في `scratchpad/d7/cal_scan/` (`calscan.py` · `cls.py` · `table.py` · `hcand.py`).
الأداةُ نفسُها على شجرة ما قبل التقويم (`7d6811b2^`) تعطي عدداً مطابقاً للجرد في 34 ملفاً من 112، وقريباً منه في أغلب الباقي. لذلك يُذكر عمودُها بجانب عمود «قبل» الأصلي، فالمقارنةُ العادلة بين قبلُ والآن هي العمودان الثالث والرابع (الأداةُ نفسُها على الشجرتين).
**المجموع في الملفات الـ112:** قبل (الجرد) 1,741 · قبل (المسحُ نفسُه) 1,978 · **الآن 898**.
**الأسباب المسموح بها وحدها:** السجلاتُ القديمة كما كُتبت (ق9) · نصوصُ التنبيهات المرسلة سابقاً · السطرُ الهجري الصغير تحت التاريخ الميلادي · كودُ الترحيل والتحويل · نصوصُ قواعد العمل. وما ليس عرضاً أصلاً (تعليقٌ أو وسمُ «د5-هـ» أو اسمُ دالة، و«صفر» بمعنى العدد) يُذكر على أنه ليس عرضاً.
كلُّ موضعٍ لم يصنّفه النمطُ آلياً (103 سطراً) قُرئ يدوياً وصُنّف في الجدول. والجداولُ المدخلة: cal-ops (أعلاه) و`calrest_report.md` و`calmigrate_report.md` و`calimport_report.md`.

| الملف | المواضع قبل (الجرد) | المسحُ نفسُه على شجرة ما قبل التقويم | المواضع الآن | ما صار ميلادياً + سطر هجري | ما بقي هجرياً ولماذا |
|---|---|---|---|---|---|
| `workers/parts/014-identity-migration-2.js` | 1 | 2 | 2 | يوم الرياض الميلادي/ISO حيث يمسّ التاريخ | ليس عرضاً (تعليق · اسم دالة · «صفر»): 2 |
| `workers/parts/016-base-shared.js` | 16 | 15 | 17 | calToday/pfDayAt ميلادي (الرياض) · المحوّل الواحد calConvDay | كود الترحيل والتحويل وخدمة التقويم: 2 · كود الترحيل والتحويل وخدمة التقويم: 10 |
| `workers/parts/019-notifications.js` | 2 | 5 | 3 | nfDeptOpDay → pfDayAt | ليس عرضاً (تعليق · اسم دالة · «صفر»): 3 |
| `workers/parts/019c-employee-transition.js` | 1 | 0 | 0 | يوم الرياض الميلادي/ISO حيث يمسّ التاريخ | — |
| `workers/parts/019d-atomic-restore.js` | 6 | 7 | 1 | أعمدة الشاهد greg_* | ليس عرضاً (وسم «د5-هـ» في تعليق): 1 |
| `workers/parts/019f-backup-converter.js` | 6 | 6 | 1 | كل نسخة قديمة تُحوَّل قبل البناء | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `workers/parts/019g-backup-import.js` | 1 | 1 | 1 | يوم الرياض الميلادي/ISO حيث يمسّ التاريخ | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `workers/parts/019p0-scheduling-base.js` | 1 | 0 | 0 | يوم الرياض الميلادي/ISO حيث يمسّ التاريخ | — |
| `workers/parts/047-retro.js` | 1 | 1 | 1 | يوم الرياض الميلادي/ISO حيث يمسّ التاريخ | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `workers/parts/048-permv4.js` | 1 | 1 | 1 | يوم الرياض الميلادي/ISO حيث يمسّ التاريخ | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `workers/parts/051a-schema-migrations.js` | 56 | 56 | 93 | الترحيل 0014: يعيد تسمية كل hijri_* إلى greg_* ويحوّل القيم | سجلات قديمة كما كُتبت (ق9): 6 · كود الترحيل والتحويل وخدمة التقويم: 28 |
| `workers/parts/054-image-contract.js` | 3 | 9 | 9 | يوم الرياض الميلادي/ISO حيث يمسّ التاريخ | ليس عرضاً (تعليق · اسم دالة · «صفر»): 9 |
| `workers/parts/059-protected-ops-2.js` | 1 | 1 | 1 | يوم الرياض الميلادي/ISO حيث يمسّ التاريخ | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `workers/parts/062b-me-history.js` | 11 | 12 | 4 | السجل بمفتاح اليوم الميلادي ISO | سطر هجري صغير تحت الميلادي: 1 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `workers/parts/063-enf-api-and-handler.js` | 5 | 34 | 33 | ساعة العرض pfDayAt بمفتاح ISO | ليس عرضاً (تعليق · اسم دالة · «صفر»): 32 |
| `src/pages/Admin.dc.html` | 19 | 30 | 19 | صفحةٌ مبنية — كمصادرها (النظام + 385) | سطر هجري صغير تحت الميلادي: 2 · سجلات قديمة كما كُتبت (ق9): 2 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/pages/Award.dc.html` | 7 | 7 | 7 | صفحةٌ مبنية — كمصادرها (النظام + 385) | سطر هجري صغير تحت الميلادي: 1 · نصوص قواعد العمل / نص يكتبه المسؤول: 1 |
| `src/pages/Daily Report.dc.html` | 37 | 38 | 9 | صفحةٌ مبنية — كمصادرها (النظام + 385) | ليس عرضاً (تعليق · اسم دالة · «صفر»): 2 |
| `src/pages/Daily Sessions.dc.html` | 77 | 79 | 19 | صفحةٌ مبنية — كمصادرها (النظام + 385) | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/pages/Daily Stats.dc.html` | 44 | 50 | 16 | صفحةٌ مبنية — كمصادرها (النظام + 385) · **أُصلح a8c49c7e** (عبر 565) | سطر هجري صغير تحت الميلادي: 7 · كود الترحيل والتحويل وخدمة التقويم: 2 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 4 |
| `src/pages/Employees.dc.html` | 76 | 70 | 25 | صفحةٌ مبنية — كمصادرها (النظام + 385) | سطر هجري صغير تحت الميلادي: 3 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/pages/Irshad.dc.html` | 46 | 53 | 13 | صفحةٌ مبنية — كمصادرها (النظام + 385) | سطر هجري صغير تحت الميلادي: 2 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/pages/Operational Plan.dc.html` | 26 | 34 | 10 | صفحةٌ مبنية — كمصادرها (النظام + 385) | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/pages/Org.dc.html` | 2 | 3 | 3 | صفحةٌ مبنية — كمصادرها (النظام + 385) · **أُصلح 60787a8b** | سطر هجري صغير تحت الميلادي: 1 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 2 |
| `src/pages/Profile.dc.html` | 24 | 25 | 5 | صفحةٌ مبنية — كمصادرها (النظام + 385) · **9f34ce77** | سطر هجري صغير تحت الميلادي: 1 |
| `src/pages/Rasd.dc.html` | 38 | 39 | 8 | صفحةٌ مبنية — كمصادرها (النظام + 385) | سطر هجري صغير تحت الميلادي: 3 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/pages/Seized.dc.html` | 47 | 57 | 13 | صفحةٌ مبنية — كمصادرها (النظام + 385) | سطر هجري صغير تحت الميلادي: 2 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/pages/Staffing.dc.html` | 19 | 24 | 5 | صفحةٌ مبنية — كمصادرها (النظام + 385) · **أُصلح 7b57580c** | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/pages/Tasks.dc.html` | 73 | 74 | 13 | صفحةٌ مبنية — كمصادرها (النظام + 385) | سطر هجري صغير تحت الميلادي: 1 |
| `src/systems/_shared/kpiring/kpi-ring.js` | 1 | 1 | 1 | الطباعة: سطر التاريخ fmtPrint ميلادي · الغلاف «لعام ٢٠٢٦م» وتحته «١٤٤٨هـ» | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/systems/_shared/print/566-print-core.js` | 10 | 11 | 3 | الطباعة: سطر التاريخ fmtPrint ميلادي · الغلاف «لعام ٢٠٢٦م» وتحته «١٤٤٨هـ» | سطر هجري صغير تحت الميلادي: 2 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 2 |
| `src/systems/award/client/logic.js` | 7 | 7 | 7 | تاريخ الإقرار ISO ميلادي · الجدول ميلادي وتحته الهجري | سطر هجري صغير تحت الميلادي: 2 · سجلات قديمة كما كُتبت (ق9): 3 · نصوص قواعد العمل / نص يكتبه المسؤول: 1 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/systems/award/client/view.html` | 1 | 1 | 1 | تاريخ الإقرار ISO ميلادي · الجدول ميلادي وتحته الهجري | نصوص قواعد العمل / نص يكتبه المسؤول: 1 |
| `src/systems/award/server/019m-award.js` | 1 | 1 | 0 | تاريخ الإقرار ISO ميلادي · الجدول ميلادي وتحته الهجري (خادم) | — |
| `src/systems/custody/server/019a-custody.js` | 21 | 19 | 1 | أعمدة greg_* · ساعة العهد يوم الرياض الميلادي · شريط الأشهر ميلادي · السند ميلادي و«الموافق» هجري (خادم) | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/systems/custody/server/019a2-custody-resolve.js` | 2 | 2 | 0 | أعمدة greg_* · ساعة العهد يوم الرياض الميلادي · شريط الأشهر ميلادي · السند ميلادي و«الموافق» هجري (خادم) | — |
| `src/systems/custody/server/019a4-custody-api.js` | 28 | 26 | 0 | أعمدة greg_* · ساعة العهد يوم الرياض الميلادي · شريط الأشهر ميلادي · السند ميلادي و«الموافق» هجري (خادم) | — |
| `src/systems/custody/server/019b2-custody-cleanup.js` | 12 | 12 | 0 | أعمدة greg_* · ساعة العهد يوم الرياض الميلادي · شريط الأشهر ميلادي · السند ميلادي و«الموافق» هجري (خادم) | — |
| `src/systems/custody/slots/emp.logic.custody.frag` | 36 | 32 | 10 | أعمدة greg_* · ساعة العهد يوم الرياض الميلادي · شريط الأشهر ميلادي · السند ميلادي و«الموافق» هجري | سطر هجري صغير تحت الميلادي: 3 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 9 |
| `src/systems/daily/client/421-round-links.js` | 2 | 6 | 5 | كروت اليوم والشهر المشتركة · مفاتيح ISO · السنة ميلادية ومداها الهجري سطر تابع · ختم الصور ميلادي ثم هجري | ليس عرضاً (تعليق · اسم دالة · «صفر»): 3 · ليس عرضاً (وسم «د5-هـ» في تعليق): 2 |
| `src/systems/daily/client/520-field-monitor.js` | 4 | 3 | 0 | كروت اليوم والشهر المشتركة · مفاتيح ISO · السنة ميلادية ومداها الهجري سطر تابع · ختم الصور ميلادي ثم هجري | — |
| `src/systems/daily/client/logic.js` | 77 | 95 | 37 | كروت اليوم والشهر المشتركة · مفاتيح ISO · السنة ميلادية ومداها الهجري سطر تابع · ختم الصور ميلادي ثم هجري | سطر هجري صغير تحت الميلادي: 6 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 24 |
| `src/systems/daily/server/019p3-scheduling-rounds.js` | 3 | 1 | 1 | كروت اليوم والشهر المشتركة · مفاتيح ISO · السنة ميلادية ومداها الهجري سطر تابع · ختم الصور ميلادي ثم هجري (خادم) | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/systems/dreport/client/logic.js` | 36 | 50 | 21 | كروت اليوم والشهر المشتركة · التقرير بمفتاح اليوم الميلادي · السنة ميلادية ومداها الهجري تابع | سطر هجري صغير تحت الميلادي: 5 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 14 |
| `src/systems/dreport/client/view.html` | 1 | 1 | 1 | كروت اليوم والشهر المشتركة · التقرير بمفتاح اليوم الميلادي · السنة ميلادية ومداها الهجري تابع | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/systems/dstats/client/580-historical-import.js` | 1 | 15 | 16 | مفاتيح الأيام ISO وأقفال site\|YYYY-MM · الكروت المشتركة · الاستيراد يحوّل الهجري إلى اليوم الميلادي | سطر هجري صغير تحت الميلادي: 1 · كود الترحيل والتحويل وخدمة التقويم: 4 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 2 · كود الترحيل والتحويل (مفردات الملف الهجري المدخَل تُحوَّل إلى اليوم الميلادي): 6 |
| `src/systems/dstats/client/logic.js` | 42 | 48 | 14 | مفاتيح الأيام ISO وأقفال site\|YYYY-MM · الكروت المشتركة · الاستيراد يحوّل الهجري إلى اليوم الميلادي · **أُصلح a8c49c7e:** أسماءُ أشهر «التحليلات» من 565 صارت ميلادية | سطر هجري صغير تحت الميلادي: 7 · كود الترحيل والتحويل وخدمة التقويم: 2 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 2 |
| `src/systems/dstats/client/view.html` | 2 | 2 | 2 | مفاتيح الأيام ISO وأقفال site\|YYYY-MM · الكروت المشتركة · الاستيراد يحوّل الهجري إلى اليوم الميلادي | ليس عرضاً (تعليق · اسم دالة · «صفر»): 2 |
| `src/systems/dstats/server/020-dstats.js` | 32 | 31 | 0 | مفاتيح الأيام ISO وأقفال site\|YYYY-MM · الكروت المشتركة · الاستيراد يحوّل الهجري إلى اليوم الميلادي (خادم) | — |
| `src/systems/dstats/slots/bc.convert.dstats.frag` | 6 | 6 | 0 | مفاتيح الأيام ISO وأقفال site\|YYYY-MM · الكروت المشتركة · الاستيراد يحوّل الهجري إلى اليوم الميلادي | — |
| `src/systems/dstats/slots/rs.plan.dstats.frag` | 6 | 6 | 0 | مفاتيح الأيام ISO وأقفال site\|YYYY-MM · الكروت المشتركة · الاستيراد يحوّل الهجري إلى اليوم الميلادي | — |
| `src/systems/irshad/client/logic.js` | 45 | 52 | 13 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · خلايا السجل ميلادي ثم هجري · ملف irshad-YYYY-MM.xlsx | سطر هجري صغير تحت الميلادي: 8 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 · سطر هجري صغير تحت الميلادي: 2 |
| `src/systems/irshad/client/view.html` | 1 | 1 | 0 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · خلايا السجل ميلادي ثم هجري · ملف irshad-YYYY-MM.xlsx | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/systems/irshad/permissions.json` | 1 | 0 | 0 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · خلايا السجل ميلادي ثم هجري · ملف irshad-YYYY-MM.xlsx | — |
| `src/systems/irshad/server/019g-irshad-domain.js` | 6 | 6 | 0 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · خلايا السجل ميلادي ثم هجري · ملف irshad-YYYY-MM.xlsx (خادم) | — |
| `src/systems/irshad/server/019h-irshad-query.js` | 48 | 47 | 0 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · خلايا السجل ميلادي ثم هجري · ملف irshad-YYYY-MM.xlsx (خادم) | — |
| `src/systems/irshad/server/019i-irshad-operations.js` | 2 | 2 | 0 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · خلايا السجل ميلادي ثم هجري · ملف irshad-YYYY-MM.xlsx (خادم) | — |
| `src/systems/irshad/server/019j-irshad-daily.js` | 4 | 4 | 0 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · خلايا السجل ميلادي ثم هجري · ملف irshad-YYYY-MM.xlsx (خادم) | — |
| `src/systems/plan/client/logic.js` | 26 | 45 | 23 | كرت الشهر المشترك · «آخر حركة» ميلادي ثم «الموافق … هـ» · أشهر الخطة ميلادية | سطر هجري صغير تحت الميلادي: 5 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 16 · سطر هجري صغير تحت الميلادي: 1 |
| `src/systems/plan/slots/p1b.slots.json` | 1 | 1 | 1 | كرت الشهر المشترك · «آخر حركة» ميلادي ثم «الموافق … هـ» · أشهر الخطة ميلادية | ليس عرضاً (وسم «د5-هـ» في ملاحظة): 1 |
| `src/systems/rasd/client/logic.js` | 38 | 39 | 8 | الأشهر والكروت ميلادية · خلية التاريخ ميلادي ثم هجري · أعمدة التصدير ميلادي + «الموافق هـ» | سطر هجري صغير تحت الميلادي: 7 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 4 |
| `src/systems/rasd/client/view.html` | 1 | 1 | 1 | الأشهر والكروت ميلادية · خلية التاريخ ميلادي ثم هجري · أعمدة التصدير ميلادي + «الموافق هـ» | سطر هجري صغير تحت الميلادي: 1 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/systems/rasd/permissions.json` | 1 | 0 | 0 | الأشهر والكروت ميلادية · خلية التاريخ ميلادي ثم هجري · أعمدة التصدير ميلادي + «الموافق هـ» | — |
| `src/systems/seized/client/logic.js` | 46 | 57 | 14 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · مفاتيح التنبيه ISO · ملف seized-YYYY-MM.xlsx | سطر هجري صغير تحت الميلادي: 8 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 4 · سطر هجري صغير تحت الميلادي: 1 |
| `src/systems/seized/client/view.html` | 1 | 1 | 0 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · مفاتيح التنبيه ISO · ملف seized-YYYY-MM.xlsx | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/systems/seized/server/019l-seized-dashboard.js` | 33 | 33 | 0 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · مفاتيح التنبيه ISO · ملف seized-YYYY-MM.xlsx (خادم) | — |
| `src/systems/seized/server/019l-seized-operations.js` | 3 | 7 | 5 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · مفاتيح التنبيه ISO · ملف seized-YYYY-MM.xlsx (خادم) | — |
| `src/systems/seized/server/019l-seized-query.js` | 10 | 12 | 3 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · مفاتيح التنبيه ISO · ملف seized-YYYY-MM.xlsx (خادم) | ليس عرضاً (تعليق · اسم دالة · «صفر»): 3 |
| `src/systems/seized/server/019l-seized.js` | 3 | 5 | 2 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · مفاتيح التنبيه ISO · ملف seized-YYYY-MM.xlsx (خادم) | ليس عرضاً (تعليق · اسم دالة · «صفر»): 2 |
| `src/systems/seized/server/019n-seized-due.js` | 1 | 2 | 1 | أعمدة greg_* · الأشهر ميلادية والكروت مشتركة · مفاتيح التنبيه ISO · ملف seized-YYYY-MM.xlsx (خادم) | — |
| `src/systems/staff/client/530-emp-day-facts.js` | 5 | 3 | 3 | كرت الشهر · الجدول الشهري بمفتاح YYYY-MM الميلادي · اسم اليوم والساعة | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/systems/staff/client/logic.js` | 19 | 35 | 17 | كرت الشهر · الجدول الشهري بمفتاح YYYY-MM الميلادي · اسم اليوم والساعة · **أُصلح 7b57580c:** «نوفمبر 2026» بلا «هـ» | سطر هجري صغير تحت الميلادي: 3 · كود الترحيل والتحويل وخدمة التقويم: 1 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 13 |
| `src/systems/tasks/client/logic-actions.js` | 1 | 1 | 1 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية | سطر هجري صغير تحت الميلادي: 1 |
| `src/systems/tasks/client/logic-adv.js` | 1 | 1 | 0 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية | — |
| `src/systems/tasks/client/logic-kpi.js` | 15 | 13 | 0 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية | — |
| `src/systems/tasks/client/logic-picker.js` | 1 | 5 | 5 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية | ليس عرضاً (تعليق · اسم دالة · «صفر»): 3 |
| `src/systems/tasks/client/logic-prod.js` | 1 | 1 | 0 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية | — |
| `src/systems/tasks/client/logic-proof.js` | 2 | 1 | 2 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية | سطر هجري صغير تحت الميلادي: 1 · سطر هجري صغير تحت الميلادي: 1 |
| `src/systems/tasks/client/logic-recur.js` | 4 | 4 | 0 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية | — |
| `src/systems/tasks/client/logic.js` | 48 | 52 | 9 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية | سطر هجري صغير تحت الميلادي: 9 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 · سطر هجري صغير تحت الميلادي: 1 |
| `src/systems/tasks/server/070-task-core.js` | 7 | 4 | 0 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية (خادم) | — |
| `src/systems/tasks/server/070b-task-rows.js` | 2 | 2 | 2 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية (خادم) | — |
| `src/systems/tasks/server/071-task-mgmt.js` | 4 | 0 | 1 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية (خادم) | — |
| `src/systems/tasks/server/072-task-elig.js` | 2 | 1 | 4 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية (خادم) | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/systems/tasks/server/073-task-recur.js` | 11 | 2 | 1 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية (خادم) | — |
| `src/systems/tasks/server/074-task-due.js` | 1 | 0 | 0 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية (خادم) | — |
| `src/systems/tasks/slots/profile.methods.2.tasks.frag` | 4 | 4 | 3 | رأس كرت اليوم ميلادي وتحته الهجري · سجل الإجراء ميلادي · هجري · ختم الإثبات ميلادي ثم هجري · KPI بالأشهر الميلادية · **9f34ce77:** سجلُّ المهمة في «صفحتي» بسطرٍ هجري تحت اليوم | سطر هجري صغير تحت الميلادي: 2 · سطر هجري صغير تحت الميلادي: 1 |
| `src/api/280-server-storage.js` | 4 | 4 | 4 | فترات ومفاتيح ISO | ليس عرضاً (تعليق · اسم دالة · «صفر»): 4 |
| `src/auth/335-identity-gate.js` | 1 | 4 | 4 | — | ليس عرضاً (تعليق · اسم دالة · «صفر»): 4 |
| `src/blocks.json` | 1 | 9 | 9 | — | ليس عرضاً (أسماءُ وحدات: 380-hijri-fallback …): 9 |
| `src/components/555-page-states.js` | 8 | 0 | 0 | — | كود الترحيل والتحويل وخدمة التقويم: 7 |
| `src/components/565-page-kit.js` | 35 | 29 | 18 | الصفحات المحوّلة لا تستعمل MONTHS/h* هنا (تعرّف أشهرها الميلادية) · **أُصلح a8c49c7e:** `MONTHS` = `G_MONTHS` | كود الترحيل والتحويل وخدمة التقويم: 3 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 2 |
| `src/core/005-kivo-ns.js` | 1 | 1 | 1 | — | ليس عرضاً (اسمُ وحدة في السجل): 1 |
| `src/core/040-intl-cache.js` | 7 | 11 | 11 | تنسيقات ميلادية مخبّأة | كود الترحيل والتحويل وخدمة التقويم: 1 |
| `src/i18n/120-arabic-digits.js` | 1 | 1 | 1 | — | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/i18n/380-hijri-fallback.js` | 5 | 7 | 7 | — | كود الترحيل والتحويل وخدمة التقويم: 2 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 · كود الترحيل والتحويل وخدمة التقويم: 1 |
| `src/i18n/385-calendar.js` | 97 | 98 | 118 | خدمة التقويم الواحدة: G_MONTHS · fmtDay/fmtMonth · gAt/gToday · البطاقة المشتركة (BassamCalCard) · hDayText/hRange للسطر التابع | سطر هجري صغير تحت الميلادي: 19 · كود الترحيل والتحويل وخدمة التقويم: 23 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 3 · كود الترحيل والتحويل وخدمة التقويم (تعريفُ السطر الهجري التابع نفسه): 8 |
| `src/layouts/260-bassam-plat.js` | 4 | 5 | 5 | {م} سنة ميلادية في نص الحقوق | كود الترحيل والتحويل وخدمة التقويم: 1 · نصوص قواعد العمل / نص يكتبه المسؤول: 1 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 2 |
| `src/layouts/root-logic.js` | 1 | 6 | 7 | — | ليس عرضاً (تعليق · اسم دالة · «صفر»): 4 |
| `src/permissions/331-perm-model.js` | 1 | 2 | 2 | — | ليس عرضاً (تعليق · اسم دالة · «صفر»): 2 |
| `src/services/060-percent-format.js` | 1 | 1 | 1 | — | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/services/290-activity-log.js` | 15 | 14 | 18 | سجل الحركة: الميلادي ثم الهجري الصغير · «قبل التحويل» للسطر القديم (ق9) | سطر هجري صغير تحت الميلادي: 1 · سجلات قديمة كما كُتبت (ق9): 3 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/services/440-count.js` | 1 | 1 | 1 | — | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/services/441-notif-core.js` | 14 | 14 | 14 | monLbl/dayLbl عبر fmtMonth/fmtDay | سجلات قديمة كما كُتبت (ق9): 1 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 2 |
| `src/services/442-notif-observer.js` | 3 | 7 | 6 | todayKey ميلادي {key,ym} · wdName | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/services/535-profile-facts.js` | 22 | 24 | 4 | pfDayAt ISO · سطر التاريخ ميلادي + hDayText | سطر هجري صغير تحت الميلادي: 1 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/services/570-bassam-xlsx.js` | 1 | 1 | 1 | — | ليس عرضاً (تعليق · اسم دالة · «صفر»): 1 |
| `src/services/590-employees-import.js` | 18 | 19 | 4 | مفاتيح الجدول ISO · منتقي الشهر ميلادي | ليس عرضاً (تعليق · اسم دالة · «صفر»): 3 |
| `src/modules/admin/logic.js` | 20 | 43 | 33 | الجدول الشهري «نوفمبر 2026» · سجل الدخول fmtDay (هجري) · استيراد تاريخي fmtDay | سطر هجري صغير تحت الميلادي: 1 · سجلات قديمة كما كُتبت (ق9): 1 · كود الترحيل والتحويل وخدمة التقويم: 4 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 14 · نص يكتبه المسؤول ({هـ} في نص الحقوق) · استيراد تاريخي يعرض fmtDay الميلادي: 1 |
| `src/modules/employees/logic.js` | 77 | 79 | 34 | مفاتيح الجدول والتقرير ISO · «آخر حضور» ميلادي · هجري · العهد ميلادي | سطر هجري صغير تحت الميلادي: 6 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 21 |
| `src/modules/org/logic-perm44.js` | 2 | 9 | 8 | كمصادر الوحدة · **أُصلح 60787a8b:** انتهاءُ المنح ميلادي ثم الهجري | سطر هجري صغير تحت الميلادي: 1 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 7 · سطر هجري صغير تحت الميلادي (انتهاء المنح — أُصلح): 1 |
| `src/modules/profile/logic.js` | 24 | 36 | 16 | صفحتي: pfDayAt ISO · الأشهر ميلادية · سطر هجري تابع · **9f34ce77** (سجلُّ المهمة) | سطر هجري صغير تحت الميلادي: 3 · ليس عرضاً (تعليق · اسم دالة · «صفر»): 11 · سطر هجري صغير تحت الميلادي: 1 |


### عرضٌ هجري وحده — العيوبُ المتبقية: **صفر**
وجد المسحُ الأول (على 15ee3c6a) ثلاثةَ عيوب، وأُصلحت كلُّها هنا، ولكل إصلاحٍ اختبارٌ يفشل على integ 616f9042 وينجح بعده (`tests/unit/v7_cal_r22_defects.test.mjs`):
| # | الموضع | كان | صار | الالتزام |
|---|---|---|---|---|
| 1 | `src/components/565-page-kit.js:38` ← `src/systems/dstats/client/logic.js:1099 · :1284 · :1285` | «التحليلات» في الإحصائيات تكتب «محرم» فوق يناير (محور الرسم ومجموعاتُ الأسبوع والشهر) | أشهرُ 565 هي `KIVO.BassamCal.G_MONTHS` (الإحصائياتُ وحدها كانت تقرؤها؛ daily/dreport/plan/staff/tasks تعرّف أشهرها الميلادية) | a8c49c7e |
| 2 | `src/modules/org/logic-perm44.js:1121-1126` (يُعرض في `:1084`) | انتهاءُ المنح المؤقّت هجريٌّ وحده | «24 نوفمبر 2026» وتحته سطرٌ صغير «14 جمادى الآخرة 1448 هـ» (`metaH` — `<small>` ثانية، و`.p44-ex small` كتلةٌ فلا يتغيّر التخطيط) | 60787a8b |
| 3 | `src/systems/staff/client/logic.js:24` | «اعتُمد جدول «نوفمبر 2026 هـ»» | «اعتُمد جدول «نوفمبر 2026»» | 7b57580c |
| 4 | `src/systems/tasks/slots/profile.methods.2.tasks.frag:458` + `profile.view.popups.tasks.frag:56` | سجلُّ المهمة في «صفحتي»: اليومُ الميلادي بلا هجري (لم يكن عيباً هجرياً، بل نقصاً عن القاعدة 11) | سطرٌ هجري صغير تحت اليوم (`whenH`) | 9f34ce77 |

لم يتغيّر ملفُّ الخادم: `workers/_worker.js` و`pk265.prod/_worker.js` مطابقان لـinteg بايتاً بايتاً (sha256 ‎5b1555e7… · gz ‎474,551).
