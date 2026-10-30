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
function osSchemaCoreResources() {
  return [
    {
      resource: "bassam_staffing_v3",
      name: "staffing",
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
    {
      resource: "bassam_shift_options_v1",
      name: "shifts",
      schema: ocArray("ops_shift_options", osSchemaShift("ops_shift_option")),
    },
    {
      resource: "bassam_dayshift_v1",
      name: "dayShift",
      schema: ocMap("ops_day_shifts", ocScalar("text")),
    },
    // Current day-focus is per-tab/device. This describes old cloud bytes only.
    {
      resource: "bassam_dayfocus_v1",
      name: "legacyDayFocus",
      schema: ocObject("ops_legacy_day_focus", osSchemaFields(["y", "m", "d"])),
    },
  ];
}
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
function osSchemaMonthControl(table) {
  var fields = osSchemaFields(["ap", "mo", "auto", "perm"]);
  fields.dopen = ocMap(table + "_open_days", ocScalar("scalar"));
  fields.dshut = ocMap(table + "_closed_days", ocScalar("scalar"));
  return ocUnion(table, [
    ocScalar("scalar"),
    ocObject(table + "_record", fields),
  ]);
}
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
var OC_SCHEDULING_RESOURCES = osSchemaCoreResources().concat(
  osSchemaPlanResources(),
);
