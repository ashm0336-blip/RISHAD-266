// V7 · د5-هـ (م1): شكلُ الطابق وعناصره (أبواب · مصليات · مسارات · معالم · نطاقات) مشتركٌ بين الخطة وأيام الجولات المنسوخة منها — جزءُ قاعدة.
// كان في جزء الخطة (019p2)؛ تبقى أيامُ الجولات تُقرأ وتُكتب بشكلها ولو غاب التشغيلُ الميداني.
function osSchemaPoint(table) {
  return ocObject(table, osSchemaFields(["x", "y"]));
}
function osSchemaPoints(table) {
  return ocArray(table, osSchemaPoint(table + "_point"));
}
function osSchemaFieldLog(table) {
  return ocArray(
    table,
    ocObject(
      table + "_entry",
      osSchemaFields(["at", "a", "st", "flow", "by", "why", "dur", "kind"]),
    ),
  );
}
function osSchemaElement(table, kind) {
  var names = ["uid", "eid", "id", "name", "label", "kind", "hideLabel", "unp"];
  if (kind === "paths") {
    names = names.concat([
      "code",
      "type",
      "dir",
      "line",
      "w",
      "active",
      "anim",
    ]);
    var path = osSchemaFields(names);
    path.pts = osSchemaPoints(table + "_points");
    return ocObject(table, path);
  }
  names = names.concat([
    "sec",
    "pri",
    "off",
    "closed",
    "needN",
    "uniNeed",
    "fst",
    "flow",
    "fAt",
    "fBy",
    "fKind",
    "cAt",
    "cAtMs",
    "cWhy",
    "cBy",
  ]);
  if (kind === "zones")
    names = names.concat([
      "code",
      "ser",
      "d",
      "cx",
      "cy",
      "rawA",
      "area",
      "rot",
      "r",
      "cat",
      "yard",
      "region",
      "level",
      "ztype",
      "zcat",
      "lang",
      "lsz",
      "count",
      "cap",
      "readiness",
    ]);
  else names = names.concat(["x", "y"]);
  if (kind === "gates")
    names = names.concat([
      "num",
      "hideNum",
      "loc",
      "gtype",
      "route",
      "cls",
      "gid",
      "pOf",
      "leafNo",
      "leafN",
    ]);
  var fields = osSchemaFields(names);
  fields.emp = osSchemaScalars(table + "_employees");
  fields.needS = ocMap(table + "_shift_needs", ocScalar("scalar"));
  fields.fLog = osSchemaFieldLog(table + "_field_log");
  if (kind === "gates") fields.cats = osSchemaScalars(table + "_categories");
  if (kind === "zones") {
    fields.pc = ocMap(table + "_prayer_counts", ocScalar("scalar"));
    fields.pts = osSchemaPoints(table + "_legacy_points");
    // Curve handles, not polygon holes. Legacy missing in/out is preserved.
    fields.hs = ocArray(
      table + "_handles",
      ocObject(table + "_handle", {
        in: osSchemaPoint(table + "_handle_in"),
        out: osSchemaPoint(table + "_handle_out"),
      }),
    );
  }
  return ocObject(table, fields);
}
function osSchemaSector(table) {
  var fields = osSchemaFields([
    "id",
    "code",
    "name",
    "cat",
    "color",
    "lead",
    "note",
    "showLbl",
  ]);
  fields.pts = osSchemaPoints(table + "_points");
  fields.emp = osSchemaScalars(table + "_employees");
  return ocObject(table, fields);
}
function osSchemaFloor(table) {
  var fields = osSchemaFields([
    "sid",
    "id",
    "n",
    "name",
    "num",
    "iid",
    "img",
    "imgW",
    "imgH",
    "approved",
    "ap",
    "chip",
    "chipTone",
    "create",
    "mpu",
    "dens",
    "showCodes",
    "hideSectors",
    "hideZones",
    "hideGates",
    "hideMarks",
    "hidePaths",
  ]);
  ["zones", "gates", "marks", "paths"].forEach(function (kind) {
    fields[kind] = ocArray(
      table + "_" + kind,
      osSchemaElement(table + "_" + kind + "_element", kind),
    );
  });
  fields.sectors = ocArray(
    table + "_sectors",
    osSchemaSector(table + "_sector"),
  );
  return ocObject(table, fields);
}
function osSchemaFloors(table) {
  return ocArray(table, osSchemaFloor(table + "_floor"));
}
