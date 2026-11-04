/* Current source only: synthetic legacy inputs, actual shared witness/compiler,
   SQLite transactions. No generated Worker, cloud, credentials or R2. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { spawnSync } from "node:child_process";
import { D1Shim, PYTHON } from "./harness.mjs";
import { operationalMigrationFixture } from "./operational_migration_fx.mjs";
const C = vm.createContext({
  TextEncoder,
  crypto: webcrypto,
  hex: (b) => Buffer.from(b).toString("hex"),
});
for (const [file, name] of [
  ["017-authorize-core.js", "parseKey"],
  ["023-resources.js", "resName"],
]) {
  const line = fs
    .readFileSync("workers/parts/" + file, "utf8")
    .split(/\r?\n/)
    .find((s) => s.startsWith("function " + name + "("));
  assert.ok(line);
  vm.runInContext(line, C);
}
C.K_DEPTS = "bassam_depts_v1";
for (const file of [
  "019d-atomic-restore.js",
  "019o-operational-codec.js",
  "019p-operations-scheduling.js",
  "019q-operations-people-tasks.js",
  "019r-operational-storage.js",
  "019s-operational-migration.js",
])
  vm.runInContext(fs.readFileSync("workers/parts/" + file, "utf8"), C, {
    filename: file,
  });
vm.runInContext(
  fs.readFileSync("workers/parts/054-image-contract.js", "utf8"),
  C,
  { filename: "054-image-contract.js" },
);
const migration = fs.readFileSync(
  "migrations/0010_operational_domains.sql",
  "utf8",
);
const sqlStatements = migration
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);
function fresh() {
  const DB = new D1Shim();
  DB.exec(
    "PRAGMA foreign_keys=ON;CREATE TABLE kv(k TEXT NOT NULL,seq INTEGER NOT NULL,v TEXT NOT NULL,PRIMARY KEY(k,seq));CREATE TABLE revs(k TEXT PRIMARY KEY,rev INTEGER NOT NULL);CREATE TABLE meta(k TEXT PRIMARY KEY,v TEXT);CREATE TABLE imgref(img TEXT NOT NULL,k TEXT NOT NULL,PRIMARY KEY(img,k));CREATE TABLE imgown(img TEXT PRIMARY KEY,st TEXT,k TEXT,uid TEXT,dept TEXT,ts INTEGER);INSERT INTO meta VALUES('schema_version','9'),('rev','7'),('restore_epoch','2');",
  );
  return { DB };
}
function put(env, key, value) {
  const raw = JSON.stringify(value),
    parts = [raw.slice(0, raw.length >> 1), raw.slice(raw.length >> 1)];
  for (let i = 0; i < parts.length; i++)
    env.DB.db.prepare("INSERT INTO kv VALUES(?,?,?)").run(key, i, parts[i]);
}
function seed(env, { large = false } = {}) {
  const fixture = operationalMigrationFixture({ employees: large ? 100 : 2 });
  put(env, C.K_DEPTS, fixture.departments);
  const documents = large
    ? fixture.documents
    : {
        ["bsdept:" + fixture.departments[0].id + ":bassam_staffing_v3"]:
          fixture.byDepartment[fixture.departments[0].id].documents
            .bassam_staffing_v3,
      };
  for (const [key, value] of Object.entries(documents)) {
    put(env, key, value);
    env.DB.db.prepare("INSERT INTO revs VALUES(?,?)").run(key, 11);
  }
  put(env, "TEST_ONLY_UNRELATED", { preserve: true });
  return { fixture, documents };
}
function ddl(env) {
  return sqlStatements.map((sql) => env.DB.prepare(sql));
}
function snapshot(env) {
  return JSON.stringify({
    kv: env.DB.q("SELECT * FROM kv ORDER BY k,seq"),
    revs: env.DB.q("SELECT * FROM revs ORDER BY k"),
    meta: env.DB.q("SELECT * FROM meta ORDER BY k"),
    imageRefs: env.DB.q("SELECT * FROM imgref ORDER BY img,k"),
    imageOwners: env.DB.q("SELECT * FROM imgown ORDER BY img"),
    tables: env.DB.q(
      "SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name",
    ),
  });
}
function close(env) {
  env.DB.db.close();
}
async function commit(env, plan, tail = []) {
  return env.DB.batch([...plan.before, ...ddl(env), ...plan.after, ...tail]);
}

test("revision tombstones of removed departments survive an empty cutover without creating resources or departments", async () => {
  for (const explicitEmptyDepartments of [false, true]) {
    const env = fresh();
    try {
      if (explicitEmptyDepartments) put(env, C.K_DEPTS, []);
      const definitions = C.opDefinitions().slice(0, 16);
      definitions.forEach((definition, index) => {
        env.DB.db
          .prepare("INSERT INTO revs VALUES(?,?)")
          .run(
            "bsdept:TEST_ONLY_REMOVED_" +
              (index % 2) +
              ":" +
              definition.resource,
            index === 0
              ? 0
              : index === 15
                ? Number.MAX_SAFE_INTEGER
                : index + 11,
          );
      });
      put(env, "TEST_ONLY_UNRELATED", { preserve: true });
      const revisions = env.DB.q("SELECT * FROM revs ORDER BY k"),
        sourceRows = env.DB.q("SELECT * FROM kv ORDER BY k,seq"),
        plan = await C.opLegacyPrepare(env);
      assert.equal(plan.n, 0);
      assert.equal(plan.domains.length, 0);
      await commit(env, plan);
      assert.deepEqual(env.DB.q("SELECT * FROM revs ORDER BY k"), revisions);
      assert.deepEqual(env.DB.q("SELECT * FROM kv ORDER BY k,seq"), sourceRows);
      assert.equal(env.DB.q("SELECT COUNT(*)n FROM ops_nodes")[0].n, 0);
      assert.equal(
        env.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v,
        "10",
      );
      assert.equal(env.DB.q("SELECT v FROM meta WHERE k='rev'")[0].v, "7");
      assert.equal(env.DB.q("PRAGMA foreign_key_check").length, 0);
    } finally {
      close(env);
    }
  }
});

test("revision tombstones still require exact canonical namespaces and safe nonnegative values before DDL", async () => {
  const canonical = "bsdept:TEST_ONLY_REMOVED:bassam_staffing_v3";
  for (const [key, revision] of [
    ["bassam_staffing_v3", 11],
    ["bassam_staffing_v3:child", 11],
    [canonical + ":child", 11],
    ["other:TEST_ONLY_REMOVED:bassam_staffing_v3", 11],
    ["bsdept::bassam_staffing_v3", 11],
    [canonical, -1],
    [canonical, 0.5],
    [canonical, "TEST_ONLY invalid revision"],
    [canonical, Number.MAX_SAFE_INTEGER + 1],
  ]) {
    const env = fresh();
    try {
      env.DB.db.prepare("INSERT INTO revs VALUES(?,?)").run(key, revision);
      // SQLite itself can refuse decoding an unsafe INTEGER before the
      // Worker validator sees it; either rejection must precede every write.
      const beforeTables = env.DB.q(
          "SELECT name,sql FROM sqlite_master ORDER BY name",
        ),
        beforeKV = env.DB.q("SELECT * FROM kv"),
        beforeRevisions = env.DB.q(
          "SELECT k,CAST(rev AS TEXT)rev FROM revs ORDER BY k",
        ),
        beforeMeta = env.DB.q("SELECT * FROM meta ORDER BY k");
      await assert.rejects(
        C.opLegacyPrepare(env),
        key === canonical
          ? /operations-cutover-revision|too large|safe integer/
          : /operations-cutover-scope/,
      );
      assert.deepEqual(
        env.DB.q("SELECT name,sql FROM sqlite_master ORDER BY name"),
        beforeTables,
      );
      assert.deepEqual(env.DB.q("SELECT * FROM kv"), beforeKV);
      assert.deepEqual(
        env.DB.q("SELECT k,CAST(rev AS TEXT)rev FROM revs ORDER BY k"),
        beforeRevisions,
      );
      assert.deepEqual(env.DB.q("SELECT * FROM meta ORDER BY k"), beforeMeta);
      assert.equal(env.DB.q("SELECT COUNT(*)n FROM revs")[0].n, 1);
    } finally {
      close(env);
    }
  }
});

test("revision tombstones never authorize a live business document in an unregistered department", async () => {
  for (const explicitEmptyDepartments of [false, true]) {
    const env = fresh();
    try {
      if (explicitEmptyDepartments) put(env, C.K_DEPTS, []);
      const key = "bsdept:TEST_ONLY_REMOVED:bassam_staffing_v3";
      put(env, key, {});
      env.DB.db.prepare("INSERT INTO revs VALUES(?,11)").run(key);
      const before = snapshot(env);
      await assert.rejects(C.opLegacyPrepare(env), /operations-cutover-scope/);
      assert.equal(snapshot(env), before);
    } finally {
      close(env);
    }
  }
});

test("revision tombstones keep exact late revision and source-KV race guards inside the migration batch", async () => {
  const first = "bsdept:TEST_ONLY_REMOVED:bassam_staffing_v3";
  for (const change of [
    (env) =>
      env.DB.db.prepare("UPDATE revs SET rev=rev+1 WHERE k=?").run(first),
    (env) => env.DB.db.prepare("DELETE FROM revs WHERE k=?").run(first),
    (env) =>
      env.DB.db
        .prepare("INSERT INTO revs VALUES(?,12)")
        .run("bsdept:TEST_ONLY_OTHER:bassam_plan_v1"),
    (env) => put(env, first, {}),
    (env) => put(env, "bassam_staffing_v3:child", {}),
    (env) => put(env, C.K_DEPTS, [{ id: "TEST_ONLY_REMOVED" }]),
  ]) {
    const env = fresh();
    try {
      env.DB.db.prepare("INSERT INTO revs VALUES(?,11)").run(first);
      const plan = await C.opLegacyPrepare(env);
      change(env);
      const afterMutation = snapshot(env);
      await assert.rejects(commit(env, plan), /KIVO_RESTORE_TARGET/);
      assert.equal(snapshot(env), afterMutation);
    } finally {
      close(env);
    }
  }
});

test("revision tombstones and department absence survive a late migration SQL rollback exactly", async () => {
  const env = fresh();
  try {
    env.DB.db
      .prepare("INSERT INTO revs VALUES(?,11)")
      .run("bsdept:TEST_ONLY_REMOVED:bassam_staffing_v3");
    const before = snapshot(env),
      plan = await C.opLegacyPrepare(env);
    await assert.rejects(
      commit(env, plan, [
        env.DB.prepare(
          "INSERT INTO TEST_ONLY_MISSING_TOMBSTONE_TABLE VALUES(1)",
        ),
      ]),
      /TEST_ONLY_MISSING_TOMBSTONE_TABLE/,
    );
    assert.equal(snapshot(env), before);
  } finally {
    close(env);
  }
});
test("migration DDL is the aggregate canonical58-table schema and carries the closed cutover guard", () => {
  const p = C.ocPrepare(C.opDefinitions()),
    expected = C.ocCreateStatements(p);
  assert.equal(Object.keys(C.ocPhysicalTables(p)).length, 58);
  assert.ok(
    Object.values(C.ocPhysicalTables(p)).every(
      (columns) => columns.length <= 100,
    ),
  );
  assert.deepEqual(sqlStatements.slice(1, -2), Array.from(expected));
  assert.match(sqlStatements[0], /KIVO_OPERATIONS_VALIDATED_CUTOVER_REQUIRED/);
  assert.match(sqlStatements.at(-1), /'schema_version','10'/);
});
test("one atomic cutover preserves100 employees, all14 source documents per department and logical revisions", async () => {
  const env = fresh();
  try {
    const { fixture, documents } = seed(env, { large: true }),
      plan = await C.opLegacyPrepare(env);
    assert.equal(plan.n, 28);
    assert.match(plan.departmentRowsSha256, /^[a-f0-9]{64}$/);
    try {
      await commit(env, plan);
    } catch (error) {
      const diagnostics = [];
      for (const statement of plan.before.filter((s) =>
        s.sql.includes("substr(CAST(t.v AS BLOB)"),
      )) {
        diagnostics.push(
          ...env.DB.q(
            "SELECT json_extract(j.value,'$.k')k,json_extract(j.value,'$.seq')seq,length(CAST(t.v AS BLOB))actual,json_extract(j.value,'$.total')expected,length(CAST(json_extract(j.value,'$.text')AS BLOB))textbytes FROM json_each(?1)j LEFT JOIN kv t ON t.k=json_extract(j.value,'$.k')AND t.seq=json_extract(j.value,'$.seq') WHERE substr(CAST(t.v AS BLOB),json_extract(j.value,'$.offset'),json_extract(j.value,'$.bytes')) IS NOT CAST(json_extract(j.value,'$.text')AS BLOB)",
            ...statement.args,
          ),
        );
      }
      error.message +=
        "\nFailed synthetic SQL: " +
        env.DB.log.at(-1) +
        "\nDiagnostics:" +
        JSON.stringify(diagnostics);
      throw error;
    }
    assert.equal(
      env.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v,
      "10",
    );
    assert.equal(env.DB.q("SELECT v FROM meta WHERE k='rev'")[0].v, "12");
    assert.equal(
      env.DB.q(
        "SELECT COUNT(*)n FROM meta WHERE k='operations_cutover_ready'",
      )[0].n,
      0,
    );
    assert.equal(
      env.DB.q(
        "SELECT COUNT(*)n FROM kv WHERE " + C.opLegacyPredicate(),
        JSON.stringify(C.opLegacyNames()),
      )[0].n,
      0,
    );
    assert.equal(
      env.DB.q("SELECT COUNT(*)n FROM kv WHERE k=?", C.K_DEPTS)[0].n,
      2,
    );
    assert.equal(
      env.DB.q("SELECT COUNT(*)n FROM kv WHERE k='TEST_ONLY_UNRELATED'")[0].n,
      2,
    );
    for (const [key, value] of Object.entries(documents)) {
      const info = C.opInfo(key),
        physical = {};
      for (const table of Object.keys(C.ocPhysicalTables(info.prepared)))
        physical[table] = env.DB.q(
          "SELECT * FROM " + table + " WHERE department_id=? AND resource=?",
          info.dept,
          info.resource,
        );
      assert.equal(
        JSON.stringify(
          C.ocInflate(
            info.prepared,
            C.ocFromPhysical(info.prepared, info.dept, info.resource, physical),
          ).value,
        ),
        JSON.stringify(value),
      );
      assert.equal(env.DB.q("SELECT rev FROM revs WHERE k=?", key)[0].rev, 11);
    }
    assert.equal(fixture.employeeCount, 100);
    assert.deepEqual(env.DB.q("PRAGMA foreign_key_check"), []);
    await C.opGuardRetired(env);
  } finally {
    close(env);
  }
});
test("global aliases, children, malformed namespaces, orphan departments and unknown shapes fail before any write", async () => {
  const keys = [
    "bassam_staffing_v3",
    "bassam_staffing_v3:child",
    "bsdept::bassam_staffing_v3",
    "bsdept:TEST_ONLY_OPERATIONS_D1:bassam_staffing_v3:child",
    "other:TEST_ONLY_OPERATIONS_D1:bassam_staffing_v3",
    "bsdept:ORPHAN:bassam_staffing_v3",
  ];
  for (const key of keys) {
    const env = fresh();
    try {
      put(env, C.K_DEPTS, [{ id: "TEST_ONLY_OPERATIONS_D1" }]);
      put(env, key, {});
      const before = snapshot(env);
      await assert.rejects(C.opLegacyPrepare(env), /operations-cutover-scope/);
      assert.equal(snapshot(env), before);
    } finally {
      close(env);
    }
  }
  const env = fresh();
  try {
    seed(env);
    put(env, "bsdept:TEST_ONLY_OPERATIONS_D1:bassam_plan_v1", {
      cfg: { unknown: 1 },
    });
    const before = snapshot(env);
    await assert.rejects(C.opLegacyPrepare(env), /unknown-field/);
    assert.equal(snapshot(env), before);
  } finally {
    close(env);
  }
});
test("missing chunks, bad JSON and invalid department/revision metadata reject before DDL", async () => {
  for (const change of [
    (e) =>
      e.DB.db
        .prepare("UPDATE kv SET seq=3 WHERE k LIKE ? AND seq=1")
        .run("%:bassam_staffing_v3"),
    (e) =>
      e.DB.db
        .prepare("UPDATE kv SET v='not-json' WHERE k LIKE ? AND seq=0")
        .run("%:bassam_staffing_v3"),
    (e) => e.DB.db.prepare("UPDATE revs SET rev=-1").run(),
    (e) => {
      e.DB.db.prepare("DELETE FROM kv WHERE k=?").run(C.K_DEPTS);
      put(e, C.K_DEPTS, [{ id: "duplicate" }, { id: "duplicate" }]);
    },
  ]) {
    const env = fresh();
    try {
      seed(env);
      change(env);
      const before = snapshot(env);
      await assert.rejects(C.opLegacyPrepare(env));
      assert.equal(snapshot(env), before);
    } finally {
      close(env);
    }
  }
});
test("source, registered department and revision races reject the planned batch without schema or data writes", async () => {
  for (const change of [
    (e) =>
      e.DB.db
        .prepare("UPDATE kv SET v=v||' ' WHERE k LIKE ? AND seq=1")
        .run("%:bassam_staffing_v3"),
    (e) =>
      e.DB.db
        .prepare("UPDATE kv SET v=v||' ' WHERE k=? AND seq=1")
        .run(C.K_DEPTS),
    (e) => e.DB.db.prepare("UPDATE revs SET rev=rev+1").run(),
    (e) => put(e, "bsdept:TEST_ONLY_OPERATIONS_D1:bassam_rounds_v1", {}),
  ]) {
    const env = fresh();
    try {
      seed(env);
      const plan = await C.opLegacyPrepare(env);
      change(env);
      const before = snapshot(env);
      await assert.rejects(commit(env, plan), /KIVO_RESTORE_TARGET/);
      assert.equal(snapshot(env), before);
    } finally {
      close(env);
    }
  }
});
test("late SQL failure rolls back DDL, all typed inserts, retired KV and readiness/global revision changes", async () => {
  const env = fresh();
  try {
    seed(env);
    const before = snapshot(env),
      plan = await C.opLegacyPrepare(env);
    await assert.rejects(
      commit(env, plan, [
        env.DB.prepare("SELECT json_extract('{}','TEST_ONLY_LATE_FAILURE')"),
      ]),
      /TEST_ONLY_LATE_FAILURE/,
    );
    assert.equal(snapshot(env), before);
  } finally {
    close(env);
  }
});
test("nonempty targets reject before writes and empty target races reject inside the final batch", async () => {
  const env = fresh();
  try {
    seed(env);
    for (const sql of C.ocCreateStatements(C.ocPrepare(C.opDefinitions())))
      env.DB.exec(sql);
    const plan = await C.opLegacyPrepare(env),
      p = C.opPrepared("bassam_callsigns_v1"),
      domain = C.ocConvert(
        p,
        "TEST_ONLY_OPERATIONS_D1",
        "bassam_callsigns_v1",
        [],
        true,
      );
    await env.DB.batch(C.opBulkInstall(env, domain.resource, domain));
    const before = snapshot(env);
    await assert.rejects(C.opLegacyPrepare(env), /cutover-target-not-empty/);
    assert.equal(snapshot(env), before);
    await assert.rejects(commit(env, plan), /KIVO_OPERATIONS_TARGET_CHANGED/);
    assert.equal(snapshot(env), before);
  } finally {
    close(env);
  }
});
test("direct DDL refuses legacy input and retired-source transaction guard rejects reintroduction", async () => {
  const env = fresh();
  try {
    seed(env);
    const before = snapshot(env);
    await assert.rejects(
      env.DB.batch(ddl(env)),
      /KIVO_OPERATIONS_VALIDATED_CUTOVER_REQUIRED/,
    );
    assert.equal(snapshot(env), before);
    const plan = await C.opLegacyPrepare(env);
    await commit(env, plan);
    put(env, "bsdept:TEST_ONLY_OPERATIONS_D1:bassam_staffing_v3:child", {});
    await assert.rejects(C.opGuardRetired(env), /legacy-source-present/);
    const stable = snapshot(env);
    await assert.rejects(
      env.DB.batch([
        env.DB.prepare("UPDATE meta SET v='forged' WHERE k='rev'"),
        C.opRetiredGuard(env),
      ]),
      /KIVO_OPERATIONS_LEGACY_SOURCE/,
    );
    assert.equal(snapshot(env), stable);
  } finally {
    close(env);
  }
});
test("cutover rebuilds exact scoped image references without image-body, ownership or R2 writes", async () => {
  const env = fresh();
  try {
    const key = "bsdept:TEST_ONLY_OPERATIONS_D1:bassam_plan_v1";
    put(env, C.K_DEPTS, [{ id: "TEST_ONLY_OPERATIONS_D1" }]);
    put(env, key, { floors: [{ sid: "s", iid: "img_test_original" }] });
    env.DB.db
      .prepare("INSERT INTO imgref VALUES(?,?)")
      .run("img_test_stale", key);
    env.DB.db
      .prepare("INSERT INTO imgref VALUES(?,?)")
      .run("img_foreign_keep", "TEST_ONLY_FOREIGN");
    env.DB.db
      .prepare("INSERT INTO imgown VALUES(?,?,?,?,?,?)")
      .run(
        "img_test_original",
        "bound",
        key,
        "TEST_ONLY_OWNER",
        "TEST_ONLY_OPERATIONS_D1",
        123,
      );
    const owners = JSON.stringify(env.DB.q("SELECT * FROM imgown"));
    const plan = await C.opLegacyPrepare(env);
    await commit(env, plan);
    assert.deepEqual(
      JSON.parse(JSON.stringify(env.DB.q("SELECT * FROM imgref ORDER BY img"))),
      [
        { img: "img_foreign_keep", k: "TEST_ONLY_FOREIGN" },
        { img: "img_test_original", k: key },
      ],
    );
    assert.equal(JSON.stringify(env.DB.q("SELECT * FROM imgown")), owners);
    assert.ok(
      !env.DB.log.some((sql) =>
        /\b(?:INSERT|UPDATE|DELETE)\b.*\b(?:imgown|imgs)\b/i.test(sql),
      ),
    );
  } finally {
    close(env);
  }
});
test("actual planned statements execute under measured D1 parser limits with no custom SQLite dependency", async () => {
  const env = fresh();
  try {
    seed(env, { large: true });
    const plan = await C.opLegacyPrepare(env),
      statements = [...plan.before, ...ddl(env), ...plan.after].map((s) => ({
        sql: s.sql,
        args: s.args,
      }));
    const program = String.raw`import json,sqlite3,sys
p=json.loads(sys.stdin.buffer.read().decode('utf-8'))
db=sqlite3.connect(':memory:',isolation_level=None)
for limit,value in [(sqlite3.SQLITE_LIMIT_COMPOUND_SELECT,5),(sqlite3.SQLITE_LIMIT_EXPR_DEPTH,100),(sqlite3.SQLITE_LIMIT_FUNCTION_ARG,32),(sqlite3.SQLITE_LIMIT_VARIABLE_NUMBER,100),(sqlite3.SQLITE_LIMIT_COLUMN,100),(sqlite3.SQLITE_LIMIT_SQL_LENGTH,100000)]:
 db.setlimit(limit,value)
 assert db.getlimit(limit)==value
db.execute('PRAGMA foreign_keys=ON')
for table in p['tables']:
 db.execute(table['sql'])
 for row in table['rows']:
  db.execute('INSERT INTO '+table['name']+'('+','.join(row.keys())+')VALUES('+','.join('?' for _ in row)+')',list(row.values()))
db.execute('BEGIN')
for index,statement in enumerate(p['statements']):
 try:db.execute(statement['sql'],statement['args']).fetchall()
 except sqlite3.Error as error:
  print(json.dumps({'failedStatement':index,'sql':statement['sql']}),file=sys.stderr)
  raise
db.execute('COMMIT')
assert db.execute("SELECT v FROM meta WHERE k='schema_version'").fetchone()[0]=='10'
assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
assert db.execute("SELECT count(*) FROM ops_nodes WHERE row_key='$'").fetchone()[0]==28
print(json.dumps({'schema':10,'compound':5,'expression':100,'functionArgs':32,'variables':100,'columns':100,'sqlBytes':100000,'rootDocuments':28,'fkViolations':0}))
`;
    const tables = env.DB.q(
      "SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name",
    ).map((table) => ({
      ...table,
      rows: env.DB.q("SELECT * FROM " + table.name),
    }));
    const replay = spawnSync(PYTHON, ["-c", program], {
      input: JSON.stringify({ tables, statements }),
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 5 * 1024 * 1024,
    });
    assert.equal(replay.status, 0, replay.stderr || replay.stdout);
    assert.equal(JSON.parse(replay.stdout).rootDocuments, 28);
  } finally {
    close(env);
  }
});
test("image reference race and late image-plan failure preserve old reference/ownership state atomically", async () => {
  for (const race of [false, true]) {
    const env = fresh();
    try {
      const key = "bsdept:TEST_ONLY_OPERATIONS_D1:bassam_plan_v1";
      put(env, C.K_DEPTS, [{ id: "TEST_ONLY_OPERATIONS_D1" }]);
      put(env, key, { floors: [{ iid: "img_test_original" }] });
      env.DB.db
        .prepare("INSERT INTO imgref VALUES(?,?)")
        .run("img_test_stale", key);
      const plan = await C.opLegacyPrepare(env);
      if (race)
        env.DB.db
          .prepare("INSERT INTO imgref VALUES(?,?)")
          .run("img_test_race", key);
      const before = snapshot(env);
      await assert.rejects(
        commit(
          env,
          plan,
          race
            ? []
            : [
                env.DB.prepare(
                  "SELECT json_extract('{}','TEST_ONLY_AFTER_IMAGE_FAILURE')",
                ),
              ],
        ),
        race ? /KIVO_RESTORE_TARGET/ : /TEST_ONLY_AFTER_IMAGE_FAILURE/,
      );
      assert.equal(snapshot(env), before);
    } finally {
      close(env);
    }
  }
});
