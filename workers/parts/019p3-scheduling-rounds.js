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
