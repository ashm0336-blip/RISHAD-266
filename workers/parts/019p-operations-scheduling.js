/* Operational scheduling shapes. Pure closed descriptors only; no storage,
   permission or migration engine. Each factory creates fresh FK-owned nodes. */
function osSchemaFields(names) {
  var fields = {};
  names.forEach(function (name) {
    fields[name] = ocScalar("scalar");
  });
  return fields;
}
function osSchemaScalars(table) {
  return ocArray(table, ocScalar("scalar"));
}
function osSchemaValue(table) {
  return Object.assign(ocScalar("scalar"), { table: table });
}
function osSchemaShift(table) {
  return ocObject(table, osSchemaFields(["name", "color", "tStart", "tEnd"]));
}
function osSchemaShiftList(table) {
  return ocArray(
    table,
    ocUnion(table + "_entry", [
      ocScalar("scalar"),
      osSchemaShift(table + "_definition"),
    ]),
  );
}
