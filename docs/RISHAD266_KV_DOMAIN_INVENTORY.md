# جرد مجالات الأعمال — دفعة المخطط 9

جُرد المصدر عند Commit `4d8ab1e81cc5dd3fadad3acaf4963a76ba206f6e` بمراجعة سجل الموارد ومسارات القراءة والحفظ والاستعادة، ثم نُفذ مجالا المضبوطات والتكريم. هذه قائمة مخازن المصدر، وليست جردًا لمحتوى قاعدة Production أو ادعاء تدقيق شامل لكل استدعاء ديناميكي. الحالة أدناه محلية قبل قبول Preview9.

| المجال | موارد KV/JSON المعرّفة | الحالة في هذه الدفعة |
|---|---|---|
|الموظفون ومراجعهم|`bassam_employees_v1`، `bassam_options_v1`|باقٍ في D1 KV/JSON|
|القوى والورديات واللقطات والأقفال|`bassam_staffing_v3`، `bassam_staffing_v2`، `bassam_staffing_snap_v1`، `bassam_staffing_locks_v1`، `bassam_callsigns_v1`، `bassam_perm_limit_v1`، `bassam_shift_options_v1`|باقٍ في D1 KV/JSON|
|الخطة التشغيلية ومراجع المواقع|`bassam_plan_v1`، `bassam_zone_opts_v1`، `bassam_gate_opts_v1`، `bassam_mark_kinds_v1`|باقٍ في D1 KV/JSON|
|الجولات ومحاور اليوم|`bassam_rounds_v1`، `bassam_dayshift_v1`، `bassam_dayfocus_v1`|باقٍ في D1 KV/JSON|
|التقرير اليومي ومراجعه|`bassam_dreport_v1`، `bassam_dr_grp_v1`، `bassam_leave_kinds_v1`|باقٍ في D1 KV/JSON|
|المهام وأقفالها|`bassam_tasks_v1`، `bassam_tasks_locks_v1`|باقٍ في D1 KV/JSON|
|المضبوطات|`bassam_seized_v1`، `bassam_seized_cat_v1`، `bassam_seized_acts_v1`، `bassam_seized_locs_v1`، `bassam_seized_jew_v1`، `bassam_seized_retro_v1`|نُقل محليًا إلى D1 علائقية في 0009؛ قبول Preview مطلوب|
|التكريم والمراجع|`bassam_award_v1`، `bassam_award_docs_v1`، `bassam_award_docs_v2`|نُقل محليًا إلى D1 علائقية في 0009؛ قبول Preview مطلوب|
|أختام التصدير التشغيلية|`bassam_last_export_v1`، `bassam_last_full_export_v1`|باقٍ في D1 KV/JSON|

تعمل وثائق المجالات الباقية عبر مخزن D1 السحابي ومهايئ جلسة المتصفح؛ وجود استدعاء `localStorage` في المصدر لا يثبت وجود قاعدة عمل محلية دائمة. يمنع المهايئ موارد المجالات المنقولة من القراءة أو إعادة الإنشاء في التخزين القديم. لم تُحذف بايتات الجهاز القديمة.

الترتيب التالي: إغلاق مجموعة القوى والورديات/التقرير اليومي/الجولات والخطة مع اعتماديات الهوية، ثم تحويل المهام بما يشمل التكرار والأهلية ومسارات الموظف. تملك المهام APIات متخصصة بالفعل، لكنها ما زالت تعدّل وثيقة JSON؛ لا يعد وجود API وحده انتقالًا علائقيًا. تُفصل دفعة الموظفين المرجعية حين تثبت خريطة المفاتيح المستقرة وتأثيرها على الوحدات المنقولة.

استُبعدت من نطاق النقل الحالي حسابات المنصة والصلاحيات والمنح والعدسات وإعداد الوحدات وسياسة كلمات المرور وتفضيلات الجهاز. تحتفظ المجالات المنقولة بأسماء الموارد المنطقية في سجل الصلاحيات والمراجعات؛ هذه الأسماء لا تعني استمرار قارئ أو كاتب KV تشغيلي.

المراجع التنفيذية: `workers/parts/023-resources.js` و`019c-employee-transition.js` و`019d-atomic-restore.js` و`019e-atomic-save.js` و`054-image-contract.js` ومسارات المهام `070`–`074`، ومصادر الصفحات وخدمات `280` و`320` و`442` و`548`. الجرد الخاص المفصل والبصمات محفوظة في `.cache/next-domains/{server,client,recovery}-inventory.json`؛ لا يحوي هذا المستند بيانات مستخدمين أو أسرارًا.
