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
function osSchemaMonthBucket(table) {
  return ocMap(table, osSchemaStaffRow(table + "_employee"), {
    fixed: { __shifts: osSchemaShiftList(table + "_shifts") },
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
      period: { root: 1, index: osPeriodIndex, summary: osSumStaffing, current: osPeriodNowMonth },   // V7 · 53: كلُّ شهرٍ فترة (019w)
      schema: ocMap("ops_staffing", osSchemaMonthBucket("ops_staffing_month")),
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
      schema: ocMap(
        "ops_staffing_locks",
        osSchemaMonthLock("ops_staffing_lock"),
      ),
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
