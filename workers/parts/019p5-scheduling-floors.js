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
/* V7 · د6 (schemafix): قراءةُ كلِّ صلاةٍ في المصلى (pc[صلاة]) بياناتٌ حقيقية بشكلين كما يكتبهما العميلُ وProduction:
   رقمٌ (نسبةٌ قديمة — أو count المنقول إلى fajr) أو «القراءةُ بالسعة» { n: العدد · cap: السعة } أو { n: null · cap: 0 · p: النسبة } حين لا سعة.
   كان المدخلُ رقماً فقط فيُرفض حفظُ القراءة بالسعة حياً واستيرادُها (operations-scalar-type). الكائنُ مغلق: لا حقلَ غير n · cap · p.
   تغيّر ترميزُ المدخل (اتحادٌ) فصفوفُ pc القائمة يرحّلها 0012_prayer_readings.sql وتقرؤها النسخُ القديمة بـosLegacyPhysical (019t). */
function osSchemaPrayerCounts(table) {
  return ocMap(
    table,
    ocUnion(table + "_reading", [
      ocScalar("scalar"),
      ocObject(table + "_reading_capacity", osSchemaFields(["n", "cap", "p"])),
    ]),
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
    fields.pc = osSchemaPrayerCounts(table + "_prayer_counts");
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
/* V7 · د6 (schemafix): مرآةُ الترحيل 0012_prayer_readings.sql لصفوفٍ مكتوبةٍ قبله (نسخةٌ حديثة صُدِّرت من قاعدةٍ بالإصدار 11):
   تُعاد بترميزها الجديد دون تغيير قيمة — عقدةُ pc ← ops_zone_prayer_counts · مدخلُها ← اتحاد ops_zone_prayer_reading بفرعٍ /v:0 ·
   وصفوفُ سجلّ التسكين تأخذ عمودَي rm و src فارغين. صفوفٌ بالترميز الجديد تعود كما هي (لا شيءَ يطابق). */
var OS_LEGACY_PC = {
  zone: "ops_plan_live_floors_floor_zones_element",
  map: "ops_plan_deleted_months",
  value: OC_TABLE_NAMES.ops_zone_prayer_reading_choice_0.t,   // جدولُ القيمة المفردة المشترك (019o1)
  counts: "ops_zone_prayer_counts",
  reading: "ops_zone_prayer_reading",
};
var OS_LEGACY_ADDED = { ops_round_day_move: ["f_rm_", "f_src_"] }, OS_LEGACY_NEW = ["ops_zone_prayer_capacity"];
function osLegacyPhysical(physical, tables) {
  if (!ocObj(physical) || !Array.isArray(physical.ops_nodes)) return physical;
  var L = OS_LEGACY_PC, out = Object.assign({}, physical), byKey = new Map();
  OS_LEGACY_NEW.forEach(function (table) {
    if (tables && ocOwn(tables, table) && !ocOwn(out, table)) out[table] = [];
  });
  Object.keys(OS_LEGACY_ADDED).forEach(function (table) {
    if (!Array.isArray(out[table])) return;
    out[table] = out[table].map(function (row) {
      if (!ocObj(row)) return row;
      var copy = Object.assign({}, row);
      OS_LEGACY_ADDED[table].forEach(function (prefix) {
        if (ocOwn(copy, prefix + "kind")) return;
        copy[prefix + "kind"] = 0;
        copy[prefix + "text"] = null;
        copy[prefix + "number"] = null;
        copy[prefix + "position"] = null;
      });
      return copy;
    });
  });
  physical.ops_nodes.forEach(function (node) {
    if (ocObj(node)) byKey.set(node.row_key, node);
  });
  var maps = new Set();
  byKey.forEach(function (node) {
    var parent = byKey.get(node.parent_key);
    if (node.schema_id === L.map && node.member_key === "pc" && parent && parent.schema_id === L.zone) maps.add(node.row_key);
  });
  if (!maps.size) return out;
  var values = new Map(), entries = new Set(), nodes = [];
  (Array.isArray(out[L.value]) ? out[L.value] : []).forEach(function (row) {
    if (ocObj(row)) values.set(row.row_key, row);
  });
  physical.ops_nodes.forEach(function (node) {
    if (!ocObj(node)) return nodes.push(node);
    if (maps.has(node.row_key)) return nodes.push(Object.assign({}, node, { schema_id: L.counts }));
    if (!maps.has(node.parent_key) || node.schema_id !== L.value) return nodes.push(node);
    entries.add(node.row_key);
    var scalar = node.node_kind === 7;
    nodes.push(Object.assign({}, node, { node_kind: scalar ? 6 : node.node_kind, variant: scalar ? 0 : null, schema_id: L.reading, entity_kind: null }));
    if (scalar)
      nodes.push(Object.assign({}, node, { row_key: node.row_key + "/v:0", parent_key: node.row_key, member_key: "@", position: 0, variant: null, tuple_length: null }));
  });
  out.ops_nodes = nodes;
  if (Array.isArray(out[L.value]))
    out[L.value] = out[L.value].reduce(function (list, row) {
      if (!ocObj(row) || !entries.has(row.row_key)) list.push(row);
      else if (byKey.get(row.row_key).node_kind === 7) list.push(Object.assign({}, row, { row_key: row.row_key + "/v:0" }));
      return list;
    }, []);
  return out;
}
