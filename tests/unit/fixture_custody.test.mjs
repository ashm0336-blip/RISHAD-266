/* The generator emits flat SQL for historical executors. Only the explicit
   batch executor below proves atomic rollback; applySql remains line-by-line. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { D1Shim, PYTHON, ROOT, applySql } from "./harness.mjs";
import { cuInflate } from "./custody_legacy_oracle.mjs";
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8"),
  CU = [
    "custody_items",
    "custody_issues",
    "custody_movements",
    "custody_requests",
    "custody_request_outputs",
  ];
function generate(mode) {
  const tempRoot = fs.realpathSync(os.tmpdir()),
    dir = fs.mkdtempSync(path.join(tempRoot, "r266-fixture-custody-"));
  try {
    const args = [
      path.join(ROOT, "tests/fixtures/gen_fixture.py"),
      "--today",
      "1448-5-12",
      "--out",
      dir,
    ];
    if (mode) args.push("--custody-storage", mode);
    execFileSync(PYTHON, args, { stdio: "pipe", windowsHide: true });
    return {
      seed: fs.readFileSync(path.join(dir, "test_seed.sql"), "utf8"),
      reset: fs.readFileSync(path.join(dir, "reset_test_fixture.sql"), "utf8"),
      fx: JSON.parse(fs.readFileSync(path.join(dir, "fixture.json"), "utf8")),
    };
  } finally {
    const resolved = fs.realpathSync(dir);
    assert.equal(path.dirname(resolved), tempRoot);
    assert.ok(path.basename(resolved).startsWith("r266-fixture-custody-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
const generated = generate();
const custodySchema = () =>
  read("migrations/0006_custody.sql").match(
    /CREATE TABLE IF NOT EXISTS custody_\w+\s*\([\s\S]*?\) WITHOUT ROWID;|CREATE(?: UNIQUE)? INDEX IF NOT EXISTS custody_\w+[\s\S]*?;/g,
  );
function database() {
  const DB = new D1Shim();
  DB.exec(read("migrations/0001_baseline.sql"));
  DB.exec(
    "PRAGMA foreign_keys=ON;INSERT INTO meta(k,v) VALUES('schema_version','7'),('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v=excluded.v;",
  );
  custodySchema().forEach((sql) => DB.exec(sql));
  read("migrations/0004_daily_stats.sql")
    .match(
      /CREATE TABLE IF NOT EXISTS daily_stats_\w+\s*\([\s\S]*?\) WITHOUT ROWID;/g,
    )
    .forEach((sql) => DB.exec(sql));
  DB.db
    .prepare("INSERT INTO kv(k,seq,v) VALUES(?,0,?)")
    .run(
      "bassam_auth_users_v1",
      '[{"id":"su","un":"TEST_ONLY_original_owner","role":"super","ph":"TEST_ONLY preserve owner verifier","privateField":"TEST_ONLY keep"}]',
    );
  DB.db
    .prepare("INSERT INTO kv(k,seq,v) VALUES(?,0,?)")
    .run(
      "bassam_depts_v1",
      '[{"id":"customer","name":"TEST_ONLY original non-fixture department"}]',
    );
  DB.exec(
    "INSERT INTO custody_items VALUES('customer','original_item','TEST_ONLY original non-fixture item',17,NULL,NULL,1)",
  );
  return DB;
}
const typed = (DB) => ({
  items: DB.q(
    "SELECT * FROM custody_items WHERE department_id='tst_d1' ORDER BY item_id",
  ),
  issues: DB.q(
    "SELECT * FROM custody_issues WHERE department_id='tst_d1' ORDER BY issue_id",
  ),
  moves: DB.q(
    "SELECT * FROM custody_movements WHERE department_id='tst_d1' ORDER BY sequence",
  ),
});
function inflate(rows) {
  return JSON.parse(JSON.stringify(cuInflate(rows)));
}
const owner = (DB) =>
  JSON.parse(DB.q("SELECT v FROM kv WHERE k='bassam_auth_users_v1'")[0].v).find(
    (u) => u.id === "su",
  );
const digest = (DB) =>
  DB.q(
    "SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ).map(({ name, sql }) => ({
    name,
    sql,
    hash: createHash("sha256")
      .update(
        JSON.stringify(
          DB.q('SELECT * FROM "' + name + '"')
            .map((r) => JSON.stringify(r))
            .sort(),
        ),
      )
      .digest("hex"),
  }));
const batch = (DB, sql) =>
  DB.batch(
    sql
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"))
      .map((s) => DB.prepare(s)),
  );

test("default custody fixture is typed, deterministic and round-trips its exact document with the canonical inflater", async () => {
  const DB = database();
  assert.equal(generated.seed, generate().seed);
  assert.equal(generated.fx.custodyStorage, "relational");
  assert.equal(
    generated.fx.deptKeys["bsdept:tst_d1:bassam_custody_v1"],
    undefined,
  );
  await applySql(DB, generated.seed);
  assert.equal(
    DB.q("SELECT COUNT(*) n FROM kv WHERE k LIKE '%bassam_custody_v1'")[0].n,
    0,
  );
  assert.deepEqual(inflate(typed(DB)), generated.fx.custodyAdd.tst_d1);
  assert.deepEqual(
    CU.map(
      (t) =>
        DB.q("SELECT COUNT(*) n FROM " + t + " WHERE department_id='tst_d1'")[0]
          .n,
    ),
    [1, 1, 1, 0, 0],
  );
  assert.equal(
    DB.q(
      "SELECT presence_mask FROM custody_items WHERE department_id='tst_d1'",
    )[0].presence_mask,
    1,
  );
  assert.equal(
    DB.q(
      "SELECT presence_mask FROM custody_movements WHERE department_id='tst_d1'",
    )[0].presence_mask,
    0,
  );
  assert.equal(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, "7");
  assert.equal(
    DB.q("SELECT COUNT(*) n FROM sqlite_master WHERE name='d1_migrations'")[0]
      .n,
    0,
  );
  assert.deepEqual(DB.q("PRAGMA foreign_key_check"), []);
});

test("typed fixture seed/reset is idempotent and preserves the owner, foreign custody, policy and original department", async () => {
  const DB = database(),
    originalOwner = owner(DB),
    foreign = DB.q(
      "SELECT * FROM custody_items WHERE department_id='customer'",
    );
  await applySql(DB, generated.seed);
  const first = typed(DB);
  await applySql(DB, generated.seed);
  assert.deepEqual(typed(DB), first);
  assert.deepEqual(owner(DB), originalOwner);
  for (let i = 0; i < 2; i++) {
    await applySql(DB, generated.reset);
    assert.deepEqual(typed(DB), { items: [], issues: [], moves: [] });
    assert.deepEqual(owner(DB), originalOwner);
    assert.deepEqual(
      DB.q("SELECT * FROM custody_items WHERE department_id='customer'"),
      foreign,
    );
    assert.deepEqual(
      JSON.parse(DB.q("SELECT v FROM kv WHERE k='bassam_depts_v1'")[0].v),
      [{ id: "customer", name: "TEST_ONLY original non-fixture department" }],
    );
    assert.equal(
      DB.q("SELECT v FROM meta WHERE k='authz_mode'")[0].v,
      "enforce",
    );
    assert.equal(
      DB.q("SELECT COUNT(*) n FROM meta WHERE k='tst_fixture_custody_v1'")[0].n,
      0,
    );
  }
  assert.deepEqual(DB.q("PRAGMA foreign_key_check"), []);
});

test("unowned reserved custody collisions stop seed and cleanup before account or business mutation", async () => {
  for (const action of ["seed", "reset"]) {
    const DB = database();
    DB.exec(
      "INSERT INTO custody_items VALUES('tst_d1','foreign_item','TEST_ONLY unowned data',9,NULL,NULL,1)",
    );
    const before = digest(DB);
    await assert.rejects(
      applySql(DB, generated[action]),
      /KIVO_FIXTURE_CUSTODY_TARGET_COLLISION/,
    );
    assert.deepEqual(digest(DB), before);
  }
});

test("an edited or extended owned custody set is not silently deleted or claimed as fixture data", async () => {
  for (const action of ["seed", "reset"])
    for (const edit of [
      "UPDATE custody_items SET qty=6 WHERE department_id='tst_d1'",
      "INSERT INTO custody_items VALUES('tst_d1','foreign_item','TEST_ONLY later non-fixture row',9,NULL,NULL,1)",
      "INSERT INTO custody_items VALUES('tst_d2','foreign_item','TEST_ONLY another department row',9,NULL,NULL,1)",
    ]) {
      const DB = database();
      await applySql(DB, generated.seed);
      DB.exec(edit);
      const before = digest(DB);
      await assert.rejects(
        applySql(DB, generated[action]),
        /KIVO_FIXTURE_CUSTODY_TARGET_COLLISION/,
      );
      assert.deepEqual(digest(DB), before);
    }
});

test("a seed failure after account/catalog writes rolls the complete local batch back with foreign keys enabled", async () => {
  const DB = database(),
    before = digest(DB);
  DB.failIf = (sql) => /^INSERT INTO custody_movements\b/.test(sql);
  await assert.rejects(batch(DB, generated.seed), /injected failure/);
  DB.failIf = null;
  assert.deepEqual(digest(DB), before);
  assert.deepEqual(DB.q("PRAGMA foreign_key_check"), []);
});

test("a cleanup failure after child deletion rolls back the owner, typed rows and ownership witness in one local batch", async () => {
  const DB = database();
  await batch(DB, generated.seed);
  const before = digest(DB);
  DB.failIf = (sql) => /^DELETE FROM custody_items\b/.test(sql);
  await assert.rejects(batch(DB, generated.reset), /injected failure/);
  DB.failIf = null;
  assert.deepEqual(digest(DB), before);
  assert.deepEqual(DB.q("PRAGMA foreign_key_check"), []);
});

test("historical custody KV is explicit, remains comparable and never seeds typed custody as a fallback", async () => {
  const legacy = generate("legacy-kv"),
    DB = database();
  assert.equal(legacy.fx.custodyStorage, "legacy-kv");
  assert.deepEqual(
    legacy.fx.deptKeys["bsdept:tst_d1:bassam_custody_v1"],
    legacy.fx.custodyAdd.tst_d1,
  );
  assert.equal(
    legacy.seed.includes("CREATE TABLE IF NOT EXISTS custody_"),
    false,
  );
  await applySql(DB, legacy.seed);
  assert.equal(
    DB.q(
      "SELECT COUNT(*) n FROM kv WHERE k='bsdept:tst_d1:bassam_custody_v1'",
    )[0].n,
    1,
  );
  assert.deepEqual(typed(DB), { items: [], issues: [], moves: [] });
  assert.equal(
    DB.q("SELECT COUNT(*) n FROM meta WHERE k='tst_fixture_custody_v1'")[0].n,
    0,
  );
});
