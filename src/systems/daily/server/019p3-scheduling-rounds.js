function osSchemaRoundDay(table) {
  var fields = osSchemaFields([
    "t",
    "ap",
    "auto",
    "from",
    "synced",
    "off",
  ]);
  fields.imp = ocUnion(table + "_import", [
    ocScalar("scalar"),
    ocObject(table + "_import_source", osSchemaFields(["src", "day"])),
  ]);
  fields.d = osSchemaFloors(table + "_floors");
  fields.shAp = ocMap(
    table + "_shift_approvals",
    ocObject(table + "_shift_approval", {
      ap: ocScalar("scalar"),
      at: ocScalar("scalar"),
      byRep: ocScalar("scalar"),
      snap: osSchemaFloors(table + "_approved_floors"),
    }),
  );
  fields.mvLog = ocArray(
    table + "_moves",
    ocObject(
      table + "_move",
      osSchemaFields([
        "t",
        "kind",
        "key",
        "tok",
        "fromI",
        "toI",
        "fromLbl",
        "toLbl",
        "by",
        "name",
      ]),
    ),
  );
  return ocObject(table, fields);
}
function osSchemaMonthControl(table) {
  var fields = osSchemaFields(["ap", "mo", "auto", "perm"]);
  fields.dopen = ocMap(table + "_open_days", ocScalar("scalar"));
  fields.dshut = ocMap(table + "_closed_days", ocScalar("scalar"));
  return ocUnion(table, [
    ocScalar("scalar"),
    ocObject(table + "_record", fields),
  ]);
}
// V7 · د5-هـ (م1): موردُ الجولات يسجّله جزؤها (كان في جزء خيارات الخطة 019p4).
function osSchemaRoundsResources() {
  return [
    {
      resource: "bassam_rounds_v1",
      name: "rounds",
      schema: ocMap("ops_rounds", null, {
        fixed: { __pMig: ocScalar("scalar") },
        patterns: [
          {
            pattern: "^m:\\d{4}-\\d{1,2}$",
            schema: osSchemaMonthControl("ops_round_month"),
          },
          {
            pattern: "^\\d{4}-\\d{1,2}-\\d{1,2}(?:-.+)?$",
            schema: osSchemaRoundDay("ops_round_day"),
          },
        ],
      }),
    },
  ];
}
