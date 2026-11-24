function osSchemaStaffRow(table) {
  var fields = osSchemaFields(["shift", "muk", "cs"]);
  fields.rest = osSchemaScalars(table + "_rest");
  fields.perm = ocUnion(table + "_perm", [
    osSchemaScalars(table + "_perm_days"),
    ocObject(table + "_perm_empty", {}),
  ]);
  fields.leaves = ocUnion(table + "_leaves", [
    ocArray(
      table + "_leave_ranges",
      ocObject(
        table + "_leave_range",
        osSchemaFields(["fd", "fm", "td", "tm", "fy", "ty", "kind"]),
      ),
    ),
    ocObject(table + "_leaves_empty", {}),
  ]);
  return ocObject(table, fields);
}
/* V7 · 53 تقويم (ق٤): calq4 — تقريرُ التعارضات الذي يكتبه الترحيل 0014 في الشهر الميلادي الذي جمع شهرين هجريين بقيمتين مختلفتين
   (وردية · مكافأة · نداء · تعريفاتُ الورديات). كلُّ سطرٍ نصُّ JSON: { e, f, a, b, ha, hb, pick, tie } — يراه مديرُ الإدارة في الجدول الشهري
   ويحذفه «تمت المراجعة» (حفظُ فترة الشهر نفسِها). مصفوفةُ نصوصٍ بجداولَ قائمة (لا جدولَ D1 جديداً). الشكلُ واحدٌ لكل دلاء الشهر
   (الحيّ والقديم والأرشيف) كي تبقى جداولُها جدولاً واحداً (019o توقيعُ الشكل) — ولا كاتبَ له إلا الترحيل في الحيّ */
function osSchemaMonthBucket(table) {
  return ocMap(table, osSchemaStaffRow(table + "_employee"), {
    fixed: { __shifts: osSchemaShiftList(table + "_shifts"), __calq4: osSchemaScalars(table + "_calq4") },
  });
}
function osSchemaMonthLock(table) {
  return ocUnion(table, [
    ocScalar("boolean"),
    ocObject(table + "_open", osSchemaFields(["mo"])),
  ]);
}
function osSchemaStaffResources() {
  return [
    {
      resource: "bassam_staffing_v3",
      name: "staffing",
      period: { root: 1, index: osPeriodIndex, summary: osSumStaffing, kpi: osKpiStaffing, current: osPeriodNowMonth, me: 'months3' },   // V7 · 53: كلُّ شهرٍ فترة (019w)
      /* V7 · 53 تقويم (ق١ · الخطر ٤): مفتاحُ الشهر YYYY-MM وحده (019p0) — كان أيَّ مفتاح فيُقبل الهجريُّ من عميلٍ قديم */
      schema: ocMap("ops_staffing", null, { patterns: [{ pattern: OS_RX_YM, schema: osSchemaMonthBucket("ops_staffing_month") }] }),
    },
    {
      resource: "bassam_staffing_v2",
      name: "staffingLegacy",
      schema: ocMap(
        "ops_staffing_legacy",
        osSchemaStaffRow("ops_staffing_legacy_employee"),
        {
          patterns: [
            {
              pattern: "^\\d{4}-\\d{1,2}$",
              schema: osSchemaMonthBucket("ops_staffing_legacy_month"),
            },
          ],
        },
      ),
    },
    // The former frozen employee-month feature has no active writer. Its known
    // bucket is archived losslessly, never overlaid on the live schedule.
    {
      resource: "bassam_staffing_snap_v1",
      name: "staffingArchive",
      schema: ocMap(
        "ops_staffing_archive",
        ocObject("ops_staffing_archive_month", {
          bucket: osSchemaMonthBucket("ops_staffing_archive_bucket"),
        }),
      ),
    },
    {
      resource: "bassam_staffing_locks_v1",
      name: "staffingLocks",
      /* V7 · 53 تقويم: اعتمادُ الشهر بمفتاح YYYY-MM وحده */
      schema: ocMap("ops_staffing_locks", null, { patterns: [{ pattern: OS_RX_YM, schema: osSchemaMonthLock("ops_staffing_lock") }] }),
    },
    {
      resource: "bassam_callsigns_v1",
      name: "callsigns",
      schema: osSchemaScalars("ops_callsigns"),
    },
    {
      resource: "bassam_perm_limit_v1",
      name: "permissionLimit",
      schema: osSchemaValue("ops_permission_limit"),
    },
  ];
}

/* V7 · 53 (kpi 9): v.kpi للشهر — مرآةُ _kLean */
function osKpiStaffing(p, v) { if (!v || typeof v !== 'object') return v; var r = {}; Object.keys(v).forEach(function (k) { if (k.indexOf('__') !== 0 && v[k] && typeof v[k] === 'object') r[k] = osKpiPick(v[k], ['rest']); }); return r; }
