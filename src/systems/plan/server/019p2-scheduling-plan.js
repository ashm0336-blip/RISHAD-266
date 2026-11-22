function osSchemaPlanMonth(table) {
  return ocUnion(table, [
    osSchemaFloors(table + "_legacy_array"),
    ocObject(table + "_record", {
      c: ocScalar("scalar"),
      mo: ocScalar("scalar"),
      d: osSchemaFloors(table + "_floors"),
    }),
  ]);
}
function osSchemaPlan(table) {
  var fields = osSchemaFields(["pMig"]);
  fields.floors = osSchemaFloors(table + "_live_floors");
  ["zones", "gates", "marks", "paths"].forEach(function (kind) {
    fields[kind] = ocArray(
      table + "_root_" + kind,
      osSchemaElement(table + "_root_" + kind + "_element", kind),
    );
  });
  fields.months = ocMap(table + "_months", osSchemaPlanMonth(table + "_month"));
  fields.delMonths = ocMap(table + "_deleted_months", ocScalar("scalar"));
  // No inner cfg writer exists in the current source. Unknown legacy members
  // fail before DDL instead of being hidden in a JSON/attribute fallback.
  fields.cfg = ocObject(table + "_legacy_cfg", {});
  return ocObject(table, fields);
}
