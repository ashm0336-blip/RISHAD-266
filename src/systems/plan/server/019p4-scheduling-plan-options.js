function osSchemaOption(table) {
  return ocUnion(table, [
    ocScalar("scalar"),
    ocObject(table + "_record", {
      n: ocScalar("scalar"),
      r: ocScalar("scalar"),
      k: ocScalar("scalar"),
      t: osSchemaScalars(table + "_types"),
      c: ocUnion(table + "_code_or_categories", [
        ocScalar("scalar"),
        osSchemaScalars(table + "_categories"),
      ]),
    }),
  ]);
}
function osSchemaZoneOptions(table) {
  var fields = osSchemaFields(["hMig", "lvV"]);
  ["region", "level", "ztype", "zcat"].forEach(function (kind) {
    fields[kind] = ocArray(
      table + "_" + kind,
      osSchemaOption(table + "_" + kind + "_option"),
    );
  });
  fields.zcatStyle = ocMap(
    table + "_category_styles",
    ocObject(
      table + "_category_style",
      osSchemaFields([
        "f",
        "o",
        "s",
        "sAuto",
        "bs",
        "bw",
        "h",
        "hc",
        "hw",
        "hg",
      ]),
    ),
  );
  return ocObject(table, fields);
}
function osSchemaPlanResources() {
  var gates = {};
  ["loc", "gtype", "kind", "route", "cls", "cat"].forEach(function (kind) {
    gates[kind] = osSchemaScalars("ops_gate_options_" + kind);
  });
  return [
    {
      resource: "bassam_plan_v1",
      name: "plan",
      schema: osSchemaPlan("ops_plan"),
      period: { field: "months", index: osPeriodIndex, summary: osSumPlan, kpi: osKpiOf('plan') },   // V7 · 53: كلُّ شهرٍ من months فترة (019w)
    },
    {
      resource: "bassam_zone_opts_v1",
      name: "zoneOptions",
      schema: osSchemaZoneOptions("ops_zone_options"),
    },
    {
      resource: "bassam_gate_opts_v1",
      name: "gateOptions",
      schema: ocObject("ops_gate_options", gates),
    },
    {
      resource: "bassam_mark_kinds_v1",
      name: "markKinds",
      schema: osSchemaScalars("ops_mark_kinds"),
    },
  ];
}
