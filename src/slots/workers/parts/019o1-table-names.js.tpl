/* ═══ خريطةُ أسماء جداول العمليات — ثابتةٌ لا تتبع ترتيبَ التسجيل (V7 · د5-د2 · قرار المراجع 1) ═══
   لكل اسمٍ معلنٍ في تعريفات الموارد: t = جدولُ الشكل (يُكتب في ops_nodes.schema_id) · e = جدولُ الكيان في D1 (null: شكلٌ بلا حقولٍ قيمية).
   الأسماءُ هنا هي أسماءُ الجداول القائمة في D1 حرفياً (الترحيل 0010 وما بعده) — كثيرٌ منها يحمل اسمَ أول برنامجٍ عرّف الشكل يومَ كُتب الترحيل،
   وهذا اسمُ جدولٍ لا أكثر: الشكلُ نفسُه تستعمله مواردُ القاعدة وبرامجُ أخرى، فيبقى الاسمُ ولو غاب ذلك البرنامج.
   لا يُمحى من هنا سطرٌ ولا يُبدَّل: تبديلُه يقطع الصفوفَ المخزَّنة عن شكلها. شكلٌ جديد = سطرٌ جديد + ترحيلُ جدوله (tools/oc_tables.mjs --check يفرض ذلك). */
var OC_TABLE_NAMES = {
@@SYS:oc.names.staff.1@@@@SYS:oc.names.dreport.1@@  ops_day_shifts: { t: "ops_day_shifts", e: null },
  ops_day_shifts_values: { t: "ops_day_shifts_values", e: "ops_day_shifts_values" },
  ops_employee_entry: { t: "ops_employee_entry", e: null },
  ops_employee_entry_choice_0: { t: "ops_day_shifts_values", e: "ops_day_shifts_values" },
  ops_employee_options: { t: "ops_employee_options", e: null },
  ops_employee_record: { t: "ops_employee_record", e: "ops_employee_record" },
  ops_employees: { t: "ops_employees", e: null },
  ops_employment_types: { t: "ops_employment_types", e: null },
  ops_employment_types_values: { t: "ops_day_shifts_values", e: "ops_day_shifts_values" },
@@SYS:oc.names.plan.1@@@@SYS:oc.names.dreport.2@@  ops_legacy_day_focus: { t: "ops_legacy_day_focus", e: "ops_legacy_day_focus" },
@@SYS:oc.names.plan.2@@@@SYS:oc.names.staff.2@@  ops_plan: { t: "ops_plan", e: "ops_plan" },
@@SYS:oc.names.plan.3@@  ops_plan_deleted_months_values: { t: "ops_staffing_month_shifts_entry_choice_0", e: "ops_staffing_month_shifts_entry_choice_0" },
@@SYS:oc.names.plan.4@@  ops_plan_live_floors_floor_gates_element_fields_1: { t: "ops_plan_live_floors_floor_gates_element_fields_1", e: "ops_plan_live_floors_floor_gates_element_fields_1" },
@@SYS:oc.names.plan.5@@  ops_plan_live_floors_floor_marks_element_fields_1: { t: "ops_plan_live_floors_floor_marks_element_fields_1", e: "ops_plan_live_floors_floor_marks_element_fields_1" },
@@SYS:oc.names.plan.6@@  ops_plan_live_floors_floor_zones_element_fields_1: { t: "ops_plan_live_floors_floor_zones_element_fields_1", e: "ops_plan_live_floors_floor_zones_element_fields_1" },
@@SYS:oc.names.plan.7@@@@SYS:oc.names.dreport.3@@@@SYS:oc.names.daily@@  ops_shift_option: { t: "ops_staffing_month_shifts_definition", e: "ops_staffing_month_shifts_definition" },
  ops_shift_options: { t: "ops_shift_options", e: null },
@@SYS:oc.names.staff.3@@  ops_staffing_month_employee_perm_days_values: { t: "ops_staffing_month_shifts_entry_choice_0", e: "ops_staffing_month_shifts_entry_choice_0" },
@@SYS:oc.names.staff.4@@  ops_task_day: { t: "ops_task_day", e: null },
@@SYS:oc.names.tasks.1@@  ops_work_types: { t: "ops_employment_types", e: null },
@@SYS:oc.names.plan.8@@};
