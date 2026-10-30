/* Actual canonical compiler -> actual SQL -> stdlib SQLite with measured D1
   trigger depth10. No mirrored delete SQL, cloud, credentials or R2. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { D1Shim, PYTHON } from "./harness.mjs";
import { canonicalDigest } from "./custody_review_fx.mjs";
import { operationalMigrationFixture } from "./operational_migration_fx.mjs";

const source = fs.readFileSync("workers/_worker.js", "utf8");
assert.equal(
  createHash("sha256").update(source).digest("hex"),
  canonicalDigest(),
  "Actual Worker and all canonical parts must agree before testing",
);
const W = await import(
  "data:text/javascript;base64," +
    Buffer.from(
      source +
        "\nexport{MIG_TABLE,KIVO_MIGRATIONS,opPrepared,opPhysicalTables,opBulkInstall,opLoadMany,opChangeStatements,opResetStatements,ocConvert,ocPhysicalRows};\n//# sourceURL=canonical-operational-delete-test.mjs",
    ).toString("base64")
);
const clone = (value) => JSON.parse(JSON.stringify(value));
const serialized = (statement) => ({
  sql: statement.sql,
  args: statement.args,
});

async function fixture() {
  const DB = new D1Shim(),
    env = { DB };
  DB.exec(W.MIG_TABLE);
  for (const migration of W.KIVO_MIGRATIONS)
    for (const sql of migration.sql) DB.exec(sql);
  DB.exec("PRAGMA foreign_keys=ON");
  DB.db
    .prepare(
      "INSERT INTO meta(k,v)VALUES('rev','7')ON CONFLICT(k)DO UPDATE SET v=excluded.v",
    )
    .run();
  DB.db
    .prepare(
      "INSERT INTO meta(k,v)VALUES('restore_epoch','2')ON CONFLICT(k)DO UPDATE SET v=excluded.v",
    )
    .run();
  const input = operationalMigrationFixture({ employees: 2 }),
    [one, two] = input.departments.map((d) => d.id),
    keys = {
      ["bsdept:" + one + ":bassam_plan_v1"]:
        input.byDepartment[one].documents.bassam_plan_v1,
      ["bsdept:" + one + ":bassam_rounds_v1"]:
        input.byDepartment[one].documents.bassam_rounds_v1,
      ["bsdept:" + two + ":bassam_plan_v1"]:
        input.byDepartment[two].documents.bassam_plan_v1,
      ["bsdept:" + two + ":bassam_shift_options_v1"]:
        input.byDepartment[two].documents.bassam_shift_options_v1,
    };
  DB.db
    .prepare("INSERT INTO kv(k,seq,v)VALUES(?,0,?)")
    .run("TEST_ONLY_UNRELATED", "KEEP EXACT");
  DB.db
    .prepare("INSERT INTO kv(k,seq,v)VALUES(?,0,?)")
    .run("bassam_depts_v1", JSON.stringify(input.departments));
  for (const [key, value] of Object.entries(keys)) {
    const [, d, resource] = key.split(":"),
      prepared = W.opPrepared(resource),
      domain = W.ocConvert(prepared, d, resource, value, true);
    await DB.batch(W.opBulkInstall(env, resource, domain));
    DB.db.prepare("INSERT INTO revs(k,rev)VALUES(?,7)").run(key);
  }
  const operationalTables = Object.keys(W.opPhysicalTables());
  const replay = ({
    statements,
    faultPositions,
    mode = "change",
    scope,
    expected,
  }) => {
    const tables = DB.q(
      "SELECT name,sql FROM sqlite_master WHERE type='table'AND name NOT LIKE 'sqlite_%'ORDER BY name",
    ).map((table) => ({ ...table, rows: DB.q("SELECT * FROM " + table.name) }));
    const indexes = DB.q(
      "SELECT sql FROM sqlite_master WHERE type='index'AND sql IS NOT NULL ORDER BY name",
    ).map((row) => row.sql);
    const result = spawnSync(
      PYTHON,
      ["tests/unit/operational_delete_sqlite.py"],
      {
        input: JSON.stringify({
          tables,
          indexes,
          operationalTables,
          statements: statements.map(serialized),
          faultPositions,
          mode,
          scope,
          expected,
        }),
        encoding: "utf8",
        windowsHide: true,
        maxBuffer: 5 * 1024 * 1024,
      },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const record = JSON.parse(result.stdout);
    assert.equal(record.success, true);
    assert.equal(record.triggerDepth, 10);
    assert.equal(record.fkViolations, 0);
    return record;
  };
  return { DB, env, keys, one, two, replay, close: () => DB.db.close() };
}
function depth(nodes) {
  const map = new Map(nodes.map((row) => [row.row_key, row]));
  let maximum = 0;
  for (const row of nodes) {
    let node = row,
      n = 0;
    const seen = new Set();
    while (node) {
      assert.equal(seen.has(node.row_key), false, "Fixture tree has no cycle");
      seen.add(node.row_key);
      n++;
      node = node.parent_key === null ? null : map.get(node.parent_key);
    }
    maximum = Math.max(maximum, n);
  }
  return maximum;
}
for (const resource of ["bassam_plan_v1", "bassam_rounds_v1"])
  test(
    "canonical " +
      resource +
      " root deletion survives depth10, preserves other scopes and rolls back detach/delete faults",
    async () => {
      const f = await fixture();
      try {
        const key = "bsdept:" + f.one + ":" + resource,
          loaded = await W.opLoadMany(f.env, [key]),
          physical = W.ocPhysicalRows(
            W.opPrepared(resource),
            loaded.domains[key],
          );
        assert.equal(
          depth(physical.ops_nodes),
          11,
          "Actual source-shaped historical tree exercises the native cascade limit",
        );
        const plan = await W.opChangeStatements(f.env, key, null),
          statements = plan.guards.concat(plan.statements),
          detach = statements.findIndex((s) =>
            s.sql.startsWith("UPDATE ops_nodes SET parent_key=NULL"),
          ),
          remove = statements.findIndex((s) =>
            s.sql.startsWith("DELETE FROM ops_nodes"),
          );
        assert.ok(detach >= plan.guards.length && remove > detach);
        const empty = W.ocPhysicalRows(
          W.opPrepared(resource),
          W.ocConvert(
            W.opPrepared(resource),
            f.one,
            resource,
            undefined,
            false,
          ),
        );
        const record = f.replay({
          statements,
          scope: [f.one, resource],
          expected: empty,
          faultPositions: [detach + 1, remove + 1],
        });
        assert.equal(record.depth11ControlRejected, true);
        assert.equal(record.allRowsExactAfterRollback, true);
      } finally {
        f.close();
      }
    },
  );
test("canonical subset deletion leaves every retained node parent and business field exact", async () => {
  const f = await fixture();
  try {
    const resource = "bassam_plan_v1",
      key = "bsdept:" + f.one + ":" + resource,
      next = clone(f.keys[key]);
    next.months = {};
    const plan = await W.opChangeStatements(f.env, key, JSON.stringify(next)),
      statements = plan.guards.concat(plan.statements),
      detach = statements.findIndex((s) =>
        s.sql.startsWith("UPDATE ops_nodes SET parent_key=NULL"),
      ),
      remove = statements.findIndex((s) =>
        s.sql.startsWith("DELETE FROM ops_nodes"),
      );
    assert.ok(detach >= 0 && remove > detach);
    const expected = W.ocPhysicalRows(
      W.opPrepared(resource),
      W.ocConvert(W.opPrepared(resource), f.one, resource, next, true),
    );
    f.replay({
      statements,
      scope: [f.one, resource],
      expected,
      faultPositions: [detach + 1, remove + 1],
    });
  } finally {
    f.close();
  }
});
test("actual reset operational statements clear depth11 trees atomically while preserving non-operational rows", async () => {
  const f = await fixture();
  try {
    const statements = W.opResetStatements(f.env),
      detach = statements.findIndex(
        (s) => s.sql === "UPDATE ops_nodes SET parent_key=NULL",
      ),
      remove = statements.findIndex((s) => s.sql === "DELETE FROM ops_nodes");
    assert.equal(remove, statements.length - 1);
    assert.equal(detach, remove - 1);
    const record = f.replay({
      statements,
      mode: "reset",
      faultPositions: [0, detach + 1, remove + 1],
    });
    assert.equal(record.unrelatedRowsUnchanged, true);
  } finally {
    f.close();
  }
});
