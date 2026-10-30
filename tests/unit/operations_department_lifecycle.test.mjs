/* Actual canonical Worker HTTP on isolated SQLite. Whole-department lifecycle
   is deliberately distinct from ordinary protected per-field task/staff edits.
   No cloud, R2, real account, reset or legacy operational KV compatibility. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { D1Shim } from "./harness.mjs";
import { canonicalDigest } from "./custody_review_fx.mjs";
import { operationalMigrationFixture } from "./operational_migration_fx.mjs";
import { peopleTaskDocuments } from "./operational_people_tasks_fx.mjs";

const source = fs.readFileSync("workers/_worker.js", "utf8");
assert.equal(
  createHash("sha256").update(source).digest("hex"),
  canonicalDigest(),
);
let instance = 0;
const loadWorker = () =>
  import(
    "data:text/javascript;base64," +
      Buffer.from(
        source +
          "\nexport{initDb,hashPw,kvPutStmts,opDefinitions,opPrepared,ocConvert,opBulkInstall,opPhysicalTables,rsEpoch};\n//# sourceURL=canonical-operations-department-lifecycle-test.mjs\n// isolated fixture " +
          ++instance,
      ).toString("base64")
  );
const W = await loadWorker();
const clone = (value) => JSON.parse(JSON.stringify(value));
const ABSENT = "bassam_staffing_snap_v1";

function exactRows(DB, where = "1", args = []) {
  return Object.fromEntries(
    DB.q(
      "SELECT name FROM sqlite_master WHERE type='table'AND name NOT LIKE 'sqlite_%'AND name!='sess'ORDER BY name",
    ).map(({ name }) => [
      name,
      DB.q(
        "SELECT * FROM " +
          name +
          (name.startsWith("ops_") ? " WHERE " + where : ""),
        ...(name.startsWith("ops_") ? args : []),
      )
        .map(JSON.stringify)
        .sort(),
    ]),
  );
}
const ok = (response) => {
  assert.equal(response.status, 200, JSON.stringify(response.json));
  assert.equal(response.json.ok, 1, JSON.stringify(response.json));
  return response.json;
};

async function world() {
  const W = await loadWorker();
  const DB = new D1Shim(),
    env = {
      DB,
      KIVO_AUTHZ_MODE: "enforce",
      ASSETS: { fetch: async () => new Response("TEST_ONLY", { status: 404 }) },
      IMG_R2: new Proxy(
        {},
        {
          get() {
            throw Error("TEST_ONLY_R2_FORBIDDEN");
          },
        },
      ),
    };
  await W.initDb(env);
  DB.exec("PRAGMA foreign_keys=ON");
  const input = operationalMigrationFixture({ employees: 4 }),
    [department, foreign] = input.departments.map((d) => d.id),
    documents = { ...input.documents };
  for (const d of input.departments) {
    Object.assign(documents, peopleTaskDocuments(d.id));
    documents["bsdept:" + d.id + ":bassam_employees_v1"] =
      input.byDepartment[d.id].employees;
  }
  delete documents["bsdept:" + department + ":" + ABSENT];
  const passwordHash = await W.hashPw("871029"),
    owner = {
      id: "TEST_ONLY_LIFECYCLE_OWNER",
      un: "1010000001",
      name: "TEST_ONLY owner",
      role: "super",
      mc: 0,
      ph: passwordHash,
    };
  const accounts = [
    owner,
    ...input.departments.map((d, i) => ({
      id: "TEST_ONLY_LIFECYCLE_STAFF" + i,
      un: String(1010000011 + i),
      name: "TEST_ONLY staff" + i,
      role: "staff",
      deptId: d.id,
      ekey: input.byDepartment[d.id].employees[0].eid,
      ph: passwordHash,
    })),
  ];
  const keys = {
    bassam_auth_users_v1: accounts,
    bassam_depts_v1: input.departments,
    bassam_perms_v1: {},
    bassam_platform_v1: {},
  };
  for (const d of input.departments)
    keys["bsdept:" + d.id + ":bassam_scope_v1"] = {
      ceiling: { Site: { mode: "ALL" }, "Zone/Element": { mode: "ALL" } },
    };
  for (const [key, value] of Object.entries(keys))
    await DB.batch(W.kvPutStmts(env, "kv", key, JSON.stringify(value)));
  for (const [key, value] of Object.entries(documents)) {
    const [, d, resource] = key.split(":");
    await DB.batch(
      W.opBulkInstall(
        env,
        resource,
        W.ocConvert(W.opPrepared(resource), d, resource, value, true),
      ),
    );
    DB.db.prepare("INSERT INTO revs(k,rev)VALUES(?,7)").run(key);
  }
  for (const [k, v] of Object.entries({
    authz_mode: "enforce",
    restore_epoch: "3",
    rev: "31",
  }))
    DB.db
      .prepare(
        "INSERT INTO meta(k,v)VALUES(?,?)ON CONFLICT(k)DO UPDATE SET v=excluded.v",
      )
      .run(k, v);
  for (const [who, account] of [
    ["owner", owner],
    ["staff", accounts[1]],
  ])
    DB.db
      .prepare("INSERT INTO sess(tok,uid,ts,la,dev,city)VALUES(?,?,?,?,?,?)")
      .run(
        "TEST_ONLY_LIFECYCLE_" + who,
        account.id,
        Date.now(),
        Date.now(),
        "TEST_ONLY",
        "TEST_ONLY",
      );
  const rawBatch = DB.batch.bind(DB);
  let atCommit = null;
  DB.batch = async (items) => {
    if (
      atCommit &&
      items.some((st) => st.sql.startsWith("INSERT INTO restore_operations("))
    ) {
      const hook = atCommit;
      atCommit = null;
      items = await hook(items);
    }
    return rawBatch(items);
  };
  const api = async (who, path, body) => {
    const response = await W.default.fetch(
      new Request("http://x" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Cookie: "bs_tok=TEST_ONLY_LIFECYCLE_" + who,
          Origin: "http://x",
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      env,
    );
    return { status: response.status, json: await response.json() };
  };
  const inventory = async (kind = "wipe") =>
    ok(await api("owner", "/api/admin/dept-" + kind + "?dept=" + department));
  const body = async (requestId, kind = "wipe") => ({
    uid: owner.id,
    dept: department,
    requestId,
    base: (await inventory(kind)).base,
    reason: "TEST_ONLY explicit whole-department " + kind,
  });
  const physical = (d) =>
    Object.fromEntries(
      Object.keys(W.opPhysicalTables()).map((table) => [
        table,
        DB.q("SELECT * FROM " + table + " WHERE department_id=?", d)
          .map(JSON.stringify)
          .sort(),
      ]),
    );
  return {
    DB,
    env,
    api,
    input,
    accounts,
    owner,
    department,
    foreign,
    documents,
    inventory,
    body,
    physical,
    atCommit: (hook) => {
      atCommit = hook;
    },
  };
}

test("whole-department inventory fences all21 including absent resources; protected source values remain populated and staff/forged UID cannot use the route", async (t) => {
  const B = await world();
  t.after(() => B.DB.db.close());
  const { department: d, documents: docs } = B;
  assert.equal(
    docs["bsdept:" + d + ":bassam_staffing_locks_v1"]["1448-01"],
    true,
  );
  assert.equal(docs["bsdept:" + d + ":bassam_tasks_locks_v1"]["1448-5"], true);
  const task = docs["bsdept:" + d + ":bassam_tasks_v1"]["1448-5-1"][0];
  assert.ok(
    task[20].ack && task[21].imgs.length && task[23].canh.length,
    "Assigned active task with ACK, proof and decision history is not an empty fixture",
  );
  assert.ok(docs["bsdept:" + d + ":bassam_plan_v1"].floors.length);
  assert.ok(docs["bsdept:" + d + ":bassam_perm_limit_v1"] !== undefined);
  const inventory = await B.inventory(),
    resources = W.opDefinitions().map(
      (def) => "bsdept:" + d + ":" + def.resource,
    );
  assert.equal(resources.length, 21);
  assert.ok(
    resources.every((key) => Number.isSafeInteger(inventory.base.kv[key])),
  );
  const absent = "bsdept:" + d + ":" + ABSENT;
  assert.equal(inventory.base.kv[absent], 0);
  for (const mutate of [
    (body) => delete body.base.kv[absent],
    (body) => {
      body.base.kv[absent] = 1;
    },
  ]) {
    const body = await B.body("TEST_ONLY_missing_or_changed_base"),
      before = exactRows(B.DB);
    mutate(body);
    assert.equal(
      (await B.api("owner", "/api/admin/dept-wipe", body)).status,
      409,
    );
    assert.deepEqual(exactRows(B.DB), before);
  }
  assert.equal(
    (await B.api("staff", "/api/admin/dept-wipe?dept=" + d)).status,
    403,
  );
  const body = await B.body("TEST_ONLY_forbidden_whole_wipe"),
    before = exactRows(B.DB);
  assert.equal(
    (
      await B.api("staff", "/api/admin/dept-wipe", {
        ...body,
        uid: B.accounts[1].id,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await B.api("owner", "/api/admin/dept-wipe", {
        ...body,
        uid: B.accounts[1].id,
      })
    ).status,
    409,
  );
  assert.deepEqual(exactRows(B.DB), before);
});

test("whole-department wipe rolls back a fault after its receipt, then commits one epoch/snapshot/receipt and exact replay while preserving foreign data and every account", async (t) => {
  const B = await world();
  t.after(() => B.DB.db.close());
  const body = await B.body("TEST_ONLY_whole_wipe_atomic"),
    foreign = B.physical(B.foreign),
    accounts = B.DB.q("SELECT * FROM kv WHERE k='bassam_auth_users_v1'"),
    departments = B.DB.q("SELECT * FROM kv WHERE k='bassam_depts_v1'");
  let before;
  B.atCommit((items) => {
    before = exactRows(B.DB);
    return items.concat(
      B.DB.prepare("INSERT INTO TEST_ONLY_MISSING_DEPT_TABLE(v)VALUES(1)"),
    );
  });
  const failed = await B.api("owner", "/api/admin/dept-wipe", body);
  assert.equal(failed.status, 500);
  assert.ok(before, "Actual route reached the receipt transaction");
  assert.deepEqual(exactRows(B.DB), before);
  assert.equal(
    B.DB.q(
      "SELECT COUNT(*)n FROM restore_operations WHERE request_id=?",
      body.requestId,
    )[0].n,
    0,
  );
  const ack = ok(await B.api("owner", "/api/admin/dept-wipe", body));
  assert.equal(ack.counts.operations, 20);
  for (const rows of Object.values(B.physical(B.department)))
    assert.deepEqual(rows, []);
  assert.deepEqual(B.physical(B.foreign), foreign);
  assert.deepEqual(
    B.DB.q("SELECT * FROM kv WHERE k='bassam_auth_users_v1'"),
    accounts,
  );
  assert.deepEqual(
    B.DB.q("SELECT * FROM kv WHERE k='bassam_depts_v1'"),
    departments,
  );
  assert.equal(await W.rsEpoch(B.env), body.base.epoch + 1);
  const receipt = B.DB.q(
    "SELECT * FROM restore_operations WHERE request_id=?",
    body.requestId,
  );
  assert.equal(receipt.length, 1);
  assert.ok(
    B.DB.q(
      "SELECT COUNT(*)n FROM restore_preimage WHERE snapshot_id=?",
      receipt[0].snapshot_id,
    )[0].n > 0,
  );
  const after = exactRows(B.DB),
    replay = ok(await B.api("owner", "/api/admin/dept-wipe", body));
  assert.equal(replay.duplicate, 1);
  assert.deepEqual(exactRows(B.DB), after);
  assert.equal(
    (
      await B.api("owner", "/api/admin/dept-wipe", {
        ...body,
        reason: "TEST_ONLY changed request reuse",
      })
    ).status,
    409,
  );
  assert.deepEqual(exactRows(B.DB), after);
  assert.deepEqual(B.DB.q("PRAGMA foreign_key_check"), []);
});

test("late raw-authority and absent-resource revision races reject wipe without deleting business rows or advancing epoch", async (t) => {
  for (const kind of ["raw-authority", "absent-revision"]) {
    await t.test(kind, async () => {
      const B = await world();
      try {
        const body = await B.body("TEST_ONLY_whole_wipe_race_" + kind);
        let afterMutation;
        B.atCommit((items) => {
          if (kind === "raw-authority")
            B.DB.db
              .prepare(
                "UPDATE kv SET v=' { } 'WHERE k='bassam_perms_v1'AND seq=0",
              )
              .run();
          else
            B.DB.db
              .prepare("INSERT INTO revs(k,rev)VALUES(?,1)")
              .run("bsdept:" + B.department + ":" + ABSENT);
          afterMutation = exactRows(B.DB);
          return items;
        });
        const response = await B.api("owner", "/api/admin/dept-wipe", body);
        assert.equal(response.status, 409, JSON.stringify(response.json));
        assert.ok(afterMutation);
        assert.deepEqual(exactRows(B.DB), afterMutation);
        assert.equal(await W.rsEpoch(B.env), body.base.epoch);
        assert.deepEqual(B.DB.q("PRAGMA foreign_key_check"), []);
      } finally {
        B.DB.db.close();
      }
    });
  }
});

test("direct department delete handles populated locked/protected domains and removes only its department accounts; exact replay cannot delete another department", async (t) => {
  const B = await world();
  t.after(() => B.DB.db.close());
  const body = await B.body("TEST_ONLY_whole_delete_populated", "delete"),
    foreign = B.physical(B.foreign);
  const ack = ok(await B.api("owner", "/api/admin/dept-delete", body));
  assert.equal(ack.counts.operations, 20);
  assert.equal(ack.counts.accounts, 1);
  for (const rows of Object.values(B.physical(B.department)))
    assert.deepEqual(rows, []);
  assert.deepEqual(B.physical(B.foreign), foreign);
  assert.deepEqual(
    JSON.parse(B.DB.q("SELECT v FROM kv WHERE k='bassam_auth_users_v1'")[0].v),
    B.accounts.filter((account) => account.deptId !== B.department),
  );
  assert.deepEqual(
    JSON.parse(B.DB.q("SELECT v FROM kv WHERE k='bassam_depts_v1'")[0].v),
    B.input.departments.filter((d) => d.id !== B.department),
  );
  assert.equal(await W.rsEpoch(B.env), body.base.epoch + 1);
  const beforeReplay = exactRows(B.DB);
  assert.equal(
    ok(await B.api("owner", "/api/admin/dept-delete", body)).duplicate,
    1,
  );
  assert.deepEqual(exactRows(B.DB), beforeReplay);
  assert.equal(
    (
      await B.api("owner", "/api/admin/dept-delete", {
        ...clone(body),
        dept: B.foreign,
      })
    ).status,
    409,
  );
  assert.deepEqual(exactRows(B.DB), beforeReplay);
  assert.deepEqual(B.DB.q("PRAGMA foreign_key_check"), []);
});
