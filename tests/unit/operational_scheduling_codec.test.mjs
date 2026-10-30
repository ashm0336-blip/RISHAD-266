/* Pure current-source descriptors. No generated Worker, cloud or old-suite run. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { DatabaseSync } from "node:sqlite";
import { operationalMigrationFixture } from "./operational_migration_fx.mjs";
const C = vm.createContext({});
for (const path of [
  "workers/parts/019o-operational-codec.js",
  "workers/parts/019p-operations-scheduling.js",
])
  vm.runInContext(fs.readFileSync(path, "utf8"), C, { filename: path });
const definitions = C.OC_SCHEDULING_RESOURCES,
  plain = (v) => JSON.parse(JSON.stringify(v));
const allPrepared = C.ocPrepare(definitions);
function prepared(resource) {
  return C.ocForResource(allPrepared, resource);
}
function convert(resource, value, present = true) {
  const p = prepared(resource);
  return {
    p,
    domain: C.ocConvert(p, "TEST_ONLY_DEPT", resource, value, present),
  };
}
function round(resource, value, present = true) {
  const { p, domain } = convert(resource, value, present);
  return C.ocInflate(p, domain);
}
function exact(resource, value) {
  assert.equal(
    JSON.stringify(round(resource, value).value),
    JSON.stringify(value),
  );
}
const row = {
  shift: "A",
  rest: ["السبت", "الجمعة"],
  muk: false,
  cs: "",
  perm: ["2", 3, null],
  leaves: [{ fd: "1", fm: 2, td: 4, tm: "2", fy: 1448, kind: "TEST_ONLY" }],
};
function floor() {
  return {
    sid: "S1",
    name: "TEST_ONLY",
    num: 0,
    approved: false,
    iid: null,
    mpu: 0,
    dens: null,
    zones: [
      {
        uid: "Z1",
        eid: "old-z",
        code: "0",
        d: "M0 0L1 1Z",
        cx: 0,
        cy: 1,
        rawA: 0,
        off: false,
        needN: null,
        needS: { A: 0, B: "2" },
        emp: ["E1", 23, "23"],
        count: null,
        pc: { fajr: 0, isha: null },
        hs: [
          { in: { x: 0, y: 1 }, out: { x: -1, y: 2 } },
          { out: { x: 1, y: 0 } },
        ],
        fLog: [{ at: 0, a: "TEST_ONLY", by: "TEST_ONLY", kind: "zones" }],
      },
    ],
    gates: [
      {
        uid: "G1",
        gid: "P",
        pOf: "P",
        leafNo: 1,
        leafN: 2,
        uniNeed: false,
        num: "01",
        x: 0,
        y: 0,
        cats: ["", "A", "A"],
        emp: [],
        closed: true,
        cWhy: "TEST_ONLY",
        fLog: [
          {
            at: 1,
            st: "closed",
            flow: "in",
            by: "TEST_ONLY",
            why: "TEST_ONLY",
            kind: "gates",
          },
        ],
      },
    ],
    marks: [{ eid: "M1", x: 2, y: 3, off: false, emp: [], needS: { A: null } }],
    paths: [
      {
        id: "P1",
        uid: "path",
        name: "",
        type: "in",
        dir: "fwd",
        line: "dash",
        w: "thin",
        active: false,
        anim: true,
        hideLabel: false,
        pts: [
          { x: 0, y: 0 },
          { x: 1, y: 2 },
        ],
      },
    ],
    sectors: [
      {
        id: "sector",
        code: "N01",
        name: "TEST_ONLY",
        cat: "",
        color: "#000000",
        lead: "",
        note: "",
        showLbl: false,
        pts: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 0, y: 2 },
        ],
        emp: ["E1"],
      },
    ],
  };
}
test("fourteen declared scheduling resources have unique closed tables and D1-safe column counts", () => {
  assert.equal(definitions.length, 14);
  assert.equal(new Set(definitions.map((d) => d.resource)).size, 14);
  const p = allPrepared,
    tables = C.ocPhysicalTables(p);
  assert.equal(p.order.length, new Set(p.order.map((s) => s.table)).size);
  assert.ok(Object.values(tables).every((columns) => columns.length <= 100));
  assert.ok(
    Object.values(tables).every(
      (columns) =>
        !columns.some((c) => /json|payload|attributes|field_name/.test(c)),
    ),
  );
  assert.ok(
    Object.keys(tables).length < 40,
    "closed scheduling entities share relational tables across contexts",
  );
  const db = new DatabaseSync(":memory:");
  try {
    for (const sql of C.ocCreateStatements(p)) db.exec(sql);
    for (const [name, columns] of Object.entries(tables))
      assert.equal(
        db.prepare("PRAGMA table_info(" + name + ")").all().length,
        columns.length,
      );
  } finally {
    db.close();
  }
});
test("staffing preserves reserved snapshots, raw month/token identity and actual legacy unions", () => {
  exact("bassam_staffing_v3", {
    "1448-01": {
      E1: row,
      __shifts: [
        { tEnd: "06:00", name: "A", color: "", tStart: "22:00" },
        "TEST_ONLY",
        1,
      ],
    },
    "1448-1": { E1: { shift: null, rest: [], perm: {}, leaves: {}, cs: "" } },
  });
  exact("bassam_staffing_v2", { E1: row });
  exact("bassam_staffing_v2", { "1448-1": { E1: row, __shifts: [] } });
  exact("bassam_staffing_locks_v1", {
    "1448-1": true,
    "1448-2": { mo: 1 },
    "1448-3": false,
  });
  exact("bassam_staffing_snap_v1", { "1448-1": { bucket: { E1: row } } });
  for (const resource of definitions.map((d) => d.resource)) {
    assert.deepEqual(plain(round(resource, undefined, false)), {
      present: false,
    });
    assert.deepEqual(plain(round(resource, null)), {
      present: true,
      value: null,
    });
  }
});
test("independent live/root/month plan containers and curve handles roundtrip without deduplication", () => {
  const live = floor(),
    archived = floor();
  archived.zones[0].emp = ["HISTORICAL"];
  archived.gates[0].closed = false;
  exact("bassam_plan_v1", {
    pMig: 3,
    zones: [...live.zones],
    gates: [],
    marks: [],
    paths: [],
    floors: [live],
    months: { "1448-1": [archived], "1448-2": { c: 1, mo: 1, d: [] } },
    cfg: {},
    delMonths: { "1447-12": 0 },
  });
});
test("manual sector assignments on zones, gates and marks retain missing/null/empty identities", () => {
  exact("bassam_plan_v1", {
    floors: [
      {
        zones: [{ sec: "TEST_ONLY_SECTOR" }],
        gates: [{ sec: null }],
        marks: [{ sec: "" }],
      },
    ],
  });
});
test("legacy zone area keeps numeric, string, null and missing primitive values", () => {
  exact("bassam_plan_v1", {floors:[{zones:[{uid:"TEST_ONLY_A",area:100},{uid:"TEST_ONLY_B",area:"100"},{uid:"TEST_ONLY_C",area:null},{uid:"TEST_ONLY_D"}]}]});
});
test("Daily source-written import provenance, type bindings and readiness remain closed and lossless", () => {
  exact("bassam_rounds_v1", {"1448-1-2":{imp:{src:"hasr",day:"2026-10-31"},d:[]},"1448-1-3":{imp:true}});
  exact("bassam_zone_opts_v1", {zcat:[{n:"TEST_ONLY category",t:["TEST_ONLY type",""]}]});
  exact("bassam_plan_v1", {floors:[{zones:[{readiness:"TEST_ONLY ready"},{readiness:null},{readiness:0}]}]});
  assert.throws(()=>convert("bassam_plan_v1",{floors:[{zones:[{readiness:{unknown:1}}]}]}),/scalar-type/);
  assert.throws(()=>convert("bassam_rounds_v1",{"1448-1-2":{imp:{src:"hasr",day:"2026-10-31",unknown:1}}}),/unknown-field/);
});
test("catalog scalar/object/code-array unions preserve order, empty values and typed style fields", () => {
  exact("bassam_zone_opts_v1", {
    lvV: 2,
    level: [{ n: "TEST_ONLY level", c: "L", r: "TEST_ONLY region" }],
  });
  exact("bassam_zone_opts_v1", {
    region: ["old", { n: "TEST_ONLY", c: 0, r: "parent" }],
    level: [],
    ztype: [{ n: "TEST_ONLY", k: "T", c: ["A", "B"] }],
    zcat: ["A", { n: "B", r: "T" }, { n: "C", c: ["X", "Y"] }],
    hMig: 3,
    zcatStyle: {
      "T|C": {
        f: "#fff",
        o: 0,
        s: null,
        sAuto: false,
        bs: "dash",
        bw: 1,
        h: "none",
        hc: "",
        hw: 0.3,
        hg: 1.6,
      },
    },
  });
  exact("bassam_gate_opts_v1", {
    loc: [],
    gtype: ["A", "A"],
    kind: [],
    route: [""],
    cls: [],
    cat: [],
  });
  exact("bassam_callsigns_v1", ["", "A", "A"]);
  exact("bassam_perm_limit_v1", "31");
  exact("bassam_perm_limit_v1", 31);
});
test("round day/month metadata, legacy day suffixes and independent shift-approval snapshots stay typed", () => {
  const original = floor(),
    approved = floor();
  approved.zones[0].pc.fajr = 4;
  exact("bassam_rounds_v1", {
    __pMig: 2,
    "m:1448-1": { ap: 1, mo: 0, dopen: { 2: 1 }, dshut: { 3: true }, auto: 1 },
    "1448-1-2": {
      t: 1,
      ap: 0,
      auto: 1,
      d: [original],
      shAp: {
        A: { ap: 1, at: "01:30", snap: [approved], byRep: 1 },
        B: { ap: 0 },
      },
      mvLog: [
        {
          t: "01:20",
          kind: "gates",
          key: "E1",
          tok: 23,
          fromI: -1,
          toI: 0,
          fromLbl: "",
          toLbl: "TEST_ONLY",
          by: "TEST_ONLY",
          name: "TEST_ONLY",
        },
      ],
    },
    "1448-1-2-old": { t: 1, d: [] },
  });
  exact("bassam_dayshift_v1", { "1448-1-2": "A" });
  exact("bassam_dayfocus_v1", { d: 2, m: 1, y: 1448 });
});
test("unknown fields, unsupported metadata and invalid nested containers fail before storage", () => {
  for (const [resource, value] of [
    ["bassam_staffing_v3", { "1448-1": { E1: { privilege: "forged" } } }],
    [
      "bassam_staffing_snap_v1",
      { "1448-1": { bucket: {}, unknownMetadata: 1 } },
    ],
    ["bassam_plan_v1", { cfg: { unknown: 1 } }],
    [
      "bassam_plan_v1",
      { floors: [{ zones: [{ pc: { fajr: { opaque: 1 } } }] }] },
    ],
    ["bassam_rounds_v1", { unknownRoot: { d: [] } }],
  ])
    assert.throws(() => convert(resource, value));
});
function insertPhysical(db, p, domain) {
  const physical = C.ocPhysicalRows(p, domain),
    tables = C.ocPhysicalTables(p);
  for (const [name, columns] of Object.entries(tables))
    for (const r of physical[name])
      db.prepare(
        "INSERT INTO " +
          name +
          "(" +
          columns.join(",") +
          ")VALUES(" +
          columns.map(() => "?").join(",") +
          ")",
      ).run(...columns.map((c) => r[c]));
  return physical;
}
function readPhysical(db, p, dept, resource) {
  return Object.fromEntries(
    Object.keys(C.ocPhysicalTables(p)).map((name) => [
      name,
      db
        .prepare(
          "SELECT * FROM " + name + " WHERE department_id=? AND resource=?",
        )
        .all(dept, resource),
    ]),
  );
}
test("actual scheduling graph isolates department and resource and rolls back every typed descendant", () => {
  const resource = "bassam_plan_v1",
    value = { floors: [floor()], months: { "1448-1": { c: 1, d: [floor()] } } },
    { p, domain } = convert(resource, value),
    db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys=ON");
    for (const sql of C.ocCreateStatements(allPrepared)) db.exec(sql);
    insertPhysical(db, p, domain);
    insertPhysical(
      db,
      p,
      C.ocConvert(p, "OTHER_TEST_DEPT", resource, value, true),
    );
    const rounds = prepared("bassam_rounds_v1"),
      roundsValue = { "1448-1-2": { d: [floor()] } };
    insertPhysical(
      db,
      rounds,
      C.ocConvert(
        rounds,
        "TEST_ONLY_DEPT",
        "bassam_rounds_v1",
        roundsValue,
        true,
      ),
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    const total = () =>
        Object.keys(C.ocPhysicalTables(p)).reduce(
          (n, name) =>
            n +
            db
              .prepare(
                "SELECT COUNT(*)n FROM " +
                  name +
                  " WHERE department_id=? AND resource=?",
              )
              .get("TEST_ONLY_DEPT", resource).n,
          0,
        ),
      before = total();
    assert.ok(before > 30);
    db.exec("BEGIN");
    db.prepare(
      "DELETE FROM ops_nodes WHERE department_id=? AND resource=? AND row_key=?",
    ).run("TEST_ONLY_DEPT", resource, "$");
    assert.equal(total(), 0);
    assert.equal(
      JSON.stringify(
        C.ocInflate(
          p,
          C.ocFromPhysical(
            p,
            "OTHER_TEST_DEPT",
            resource,
            readPhysical(db, p, "OTHER_TEST_DEPT", resource),
          ),
        ).value,
      ),
      JSON.stringify(value),
    );
    assert.equal(
      JSON.stringify(
        C.ocInflate(
          rounds,
          C.ocFromPhysical(
            rounds,
            "TEST_ONLY_DEPT",
            "bassam_rounds_v1",
            readPhysical(db, rounds, "TEST_ONLY_DEPT", "bassam_rounds_v1"),
          ),
        ).value,
      ),
      JSON.stringify(roundsValue),
    );
    db.exec("ROLLBACK");
    assert.equal(total(), before);
    const loaded = C.ocFromPhysical(
      p,
      "TEST_ONLY_DEPT",
      resource,
      readPhysical(db, p, "TEST_ONLY_DEPT", resource),
    );
    assert.equal(
      JSON.stringify(C.ocInflate(p, loaded).value),
      JSON.stringify(value),
    );
  } finally {
    db.close();
  }
});
test("typed entities reject the wrong table and parent links cannot cross department or resource", () => {
  const resource = "bassam_plan_v1",
    p = prepared(resource),
    domain = C.ocConvert(
      p,
      "TEST_ONLY_DEPT",
      resource,
      { floors: [floor()] },
      true,
    ),
    physical = C.ocPhysicalRows(p, domain),
    db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys=ON");
    for (const sql of C.ocCreateStatements(allPrepared)) db.exec(sql);
    insertPhysical(db, p, domain);
    const node = plain(physical.ops_nodes.find((r) => r.parent_key !== null));
    const columns = C.OC_NODE_COLUMNS;
    node.row_key = "cross-dept";
    node.department_id = "UNREGISTERED_TEST_DEPT";
    assert.throws(
      () =>
        db
          .prepare(
            "INSERT INTO ops_nodes(" +
              columns.join(",") +
              ")VALUES(" +
              columns.map(() => "?").join(",") +
              ")",
          )
          .run(...columns.map((c) => node[c])),
      /FOREIGN KEY/,
    );
    node.department_id = "TEST_ONLY_DEPT";
    node.resource = "bassam_rounds_v1";
    node.row_key = "cross-resource";
    assert.throws(
      () =>
        db
          .prepare(
            "INSERT INTO ops_nodes(" +
              columns.join(",") +
              ")VALUES(" +
              columns.map(() => "?").join(",") +
              ")",
          )
          .run(...columns.map((c) => node[c])),
      /FOREIGN KEY/,
    );
    const table = Object.keys(physical).find(
        (name) => name !== "ops_nodes" && physical[name].length,
      ),
      entry = plain(physical[table][0]),
      entityColumns = C.ocPhysicalTables(p)[table];
    entry.row_key = "wrong-kind";
    entry.entity_kind = "wrong_table";
    assert.throws(
      () =>
        db
          .prepare(
            "INSERT INTO " +
              table +
              "(" +
              entityColumns.join(",") +
              ")VALUES(" +
              entityColumns.map(() => "?").join(",") +
              ")",
          )
          .run(...entityColumns.map((c) => entry[c])),
      /CHECK/,
    );
    const victim = physical.ops_nodes.find(
      (r) => r.entity_kind && r.entity_kind !== table,
    );
    assert.ok(victim);
    entry.row_key = victim.row_key;
    entry.entity_kind = table;
    assert.throws(
      () =>
        db
          .prepare(
            "INSERT INTO " +
              table +
              "(" +
              entityColumns.join(",") +
              ")VALUES(" +
              entityColumns.map(() => "?").join(",") +
              ")",
          )
          .run(...entityColumns.map((c) => entry[c])),
      /FOREIGN KEY/,
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    db.close();
  }
});
test("100 employees across two departments preserve all fourteen source-derived variants in shared tables", () => {
  const fixture = operationalMigrationFixture(),
    db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys=ON");
    for (const sql of C.ocCreateStatements(allPrepared)) db.exec(sql);
    assert.equal(fixture.employeeCount, 100);
    assert.equal(fixture.departments.length, 2);
    for (const { id: department } of fixture.departments)
      for (const [resource, value] of Object.entries(
        fixture.byDepartment[department].documents,
      )) {
        const p = prepared(resource),
          domain = C.ocConvert(p, department, resource, value, true);
        insertPhysical(db, p, domain);
      }
    for (const { id: department } of fixture.departments)
      for (const [resource, value] of Object.entries(
        fixture.byDepartment[department].documents,
      )) {
        const p = prepared(resource),
          domain = C.ocFromPhysical(
            p,
            department,
            resource,
            readPhysical(db, p, department, resource),
          );
        assert.equal(
          JSON.stringify(C.ocInflate(p, domain).value),
          JSON.stringify(value),
        );
      }
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(
      db.prepare("SELECT COUNT(*)n FROM ops_nodes WHERE row_key=?").get("$").n,
      28,
    );
  } finally {
    db.close();
  }
});
