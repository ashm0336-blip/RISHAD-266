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
