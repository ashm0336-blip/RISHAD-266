/* Actual canonical Worker HTTP and SQLite. Tests protect the existing
   registered-department guard; no invented department, permission bypass,
   device storage, schema9 fixture override, cloud or real account is used. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { D1Shim } from "./harness.mjs";
import { canonicalDigest } from "./custody_review_fx.mjs";
import { candidateWorker } from "./irshad_domain_fx.mjs";

const SOURCE = fs.readFileSync("workers/_worker.js");
assert.equal(
  createHash("sha256").update(SOURCE).digest("hex"),
  canonicalDigest(),
);
const ONE = "TEST_ONLY_CONTEXT_D1",
  TWO = "TEST_ONLY_CONTEXT_D2",
  EMP = "TEST_ONLY_CONTEXT_E1";
const NAMES = [
  "cuClock",
  "opBulkInstall",
  "opPrepared",
  "ocConvert",
  "irConvert",
  "irInstallStatements",
  "szConvert",
  "szInstallStatements",
  "awConvert",
  "awInstallStatements",
];
const DOMAIN_VIEWS = {
  irshad: ["catalogs", "calendar", "records", "dashboard"],
  seized: ["catalogs", "context", "calendar", "records", "dashboard"],
  award: ["context", "references", "records"],
};

function businessSnapshot(DB) {
  // Session last-access/rate-limit/security bookkeeping is independent of a
  // rejected command. Business, identities, policy, revisions and receipts
  // must remain byte-for-byte equal.
  return Object.fromEntries(
    DB.q(
      "SELECT name FROM sqlite_master WHERE type='table'AND name NOT LIKE 'sqlite_%'AND name NOT IN('sess','rl','guard','sec')ORDER BY name",
    ).map(({ name }) => [
      name,
      DB.q("SELECT * FROM " + name)
        .map(JSON.stringify)
        .sort(),
    ]),
  );
}
function ok(response) {
  assert.equal(response.status, 200, JSON.stringify(response.json));
  assert.equal(response.json.ok, 1, JSON.stringify(response.json));
  return response.json;
}
function denied(response, domain) {
  assert.equal(response.status, 403, JSON.stringify(response.json));
  assert.equal(response.json.ok, 0);
  assert.equal(response.json.err, domain + "-denied");
  assert.ok(!JSON.stringify(response.json).includes("TEST_ONLY_PRIVATE_"));
  for (const key of [
    "rows",
    "reports",
    "recs",
    "dashboard",
    "summary",
    "record",
    "context",
    "resources",
  ])
    assert.equal(Object.hasOwn(response.json, key), false, key);
}

async function world({ registered = true, seed = true } = {}) {
  const W = await candidateWorker(NAMES),
    DB = new D1Shim(),
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
  const users = [
    { id: "TEST_ONLY_CONTEXT_OWNER", name: "TEST_ONLY owner", role: "super" },
    {
      id: "TEST_ONLY_CONTEXT_STAFF",
      name: "TEST_ONLY reader",
      role: "staff",
      deptId: ONE,
      ekey: EMP,
    },
    {
      id: "TEST_ONLY_CONTEXT_NOVIEW",
      name: "TEST_ONLY no-view",
      role: "staff",
      deptId: ONE,
      ekey: "TEST_ONLY_CONTEXT_E0",
    },
  ];
  const permissions = {
    caps: {
      [ONE]: ["irshad", "seized", "award"],
      [TWO]: ["irshad", "seized", "award"],
    },
    emps: {
      [ONE]: {
        [EMP]: {
          "irshad/records": ["view"],
          "irshad/dash": ["view"],
          "seized/records": ["view"],
          "seized/dash": ["view"],
          "award/new": ["view"],
          "award/res": ["view"],
          "award/doc": ["view"],
        },
      },
    },
  };
  const put = async (key, value) => {
    await DB.batch(W.kvPutStmts(env, "kv", key, JSON.stringify(value)));
    W.preOff(env);
  };
  await put("bassam_auth_users_v1", users);
  await put("bassam_perms_v1", permissions);
  await put("bassam_platform_v1", {});
  if (registered)
    await put("bassam_depts_v1", [
      { id: ONE, name: "TEST_ONLY department1" },
      { id: TWO, name: "TEST_ONLY department2" },
    ]);
  DB.db
    .prepare(
      "INSERT INTO meta(k,v)VALUES('authz_mode','enforce')ON CONFLICT(k)DO UPDATE SET v=excluded.v",
    )
    .run();
  // Direct fixture installation must supply the global revision normally
  // created by the existing account/business provisioning paths.
  DB.db
    .prepare(
      "INSERT INTO meta(k,v)VALUES('rev','7')ON CONFLICT(k)DO UPDATE SET v=excluded.v",
    )
    .run();
  for (const [who, user] of [
    ["owner", users[0]],
    ["staff", users[1]],
    ["noView", users[2]],
  ])
    DB.db
      .prepare("INSERT INTO sess(tok,uid,ts,la,dev,city)VALUES(?,?,?,?,?,?)")
      .run(
        "TEST_ONLY_CONTEXT_SESSION_" + who,
        user.id,
        Date.now(),
        Date.now(),
        "TEST_ONLY",
        "TEST_ONLY",
      );
  const clock = W.cuClock(),
    ym = clock.y + "-" + clock.m;
  if (seed)
    for (const department of [ONE, TWO]) {
      const marker = "TEST_ONLY_PRIVATE_" + department,
        employee = department === ONE ? EMP : "TEST_ONLY_CONTEXT_E2";
      await put("bsdept:" + department + ":bassam_scope_v1", {
        ceiling: { Site: { mode: "ALL" }, "Zone/Element": { mode: "ALL" } },
        emp: { [EMP]: { Shift: { mode: "n/a" } } },
      });
      for (const [resource, value] of Object.entries({
        bassam_employees_v1: [
          { eid: employee, name: marker, nid: "1000000011" },
        ],
        bassam_shift_options_v1: [
          { name: "TEST_ONLY_SHIFT", tStart: "00:00", tEnd: "23:59" },
        ],
        bassam_staffing_v3: {
          [ym]: { [employee]: { shift: "TEST_ONLY_SHIFT" } },
        },
      }))
        await DB.batch(
          W.opBulkInstall(
            env,
            resource,
            W.ocConvert(
              W.opPrepared(resource),
              department,
              resource,
              value,
              true,
            ),
          ),
        );
      const date = { y: clock.y, m: clock.m, d: clock.d },
        id = marker + "_record";
      await DB.batch(
        W.irInstallStatements(
          env,
          W.irConvert(department, {
            reports: {
              reports: [
                {
                  id,
                  ...date,
                  ts: Date.now(),
                  eid: employee,
                  name: marker,
                  shift: "TEST_ONLY_SHIFT",
                  loc: marker,
                  langs: [],
                  bro: 1,
                  pros: 0,
                  pol: 0,
                },
              ],
            },
            languages: [],
            locations: [marker],
          }),
        ),
      );
      await DB.batch(
        W.szInstallStatements(
          env,
          W.szConvert(department, {
            reports: {
              reports: [
                {
                  id,
                  ...date,
                  ts: Date.now(),
                  eid: employee,
                  actor: marker,
                  actorKey: employee,
                  shift: "TEST_ONLY_SHIFT",
                  loc: marker,
                  items: [
                    {
                      id: 23,
                      n: 1,
                      val: 0,
                      act: "sto",
                      kind: "",
                      kindTxt: "",
                      photos: [],
                    },
                  ],
                },
              ],
            },
            locations: [marker],
          }),
        ),
      );
      await DB.batch(
        W.awInstallStatements(
          env,
          W.awConvert(department, {
            records: {
              recs: [
                {
                  id,
                  ekey: employee,
                  name: marker,
                  cat: "emp",
                  hij: clock.y + "-" + clock.m + "-" + clock.d,
                  score: 1,
                  st: "قيد التحكيم",
                },
              ],
            },
          }),
        ),
      );
    }
  const whoId = (who) =>
    users[who === "owner" ? 0 : who === "staff" ? 1 : 2].id;
  const api = async (who, path, body) => {
    const response = await W.default.fetch(
      new Request("http://x" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Cookie: "bs_tok=TEST_ONLY_CONTEXT_SESSION_" + who,
          Origin: "http://x",
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      env,
    );
    return { status: response.status, json: await response.json() };
  };
  const read = (domain, view, department = ONE, who = "owner", extra = {}) => {
    const params = {
      uid: whoId(who),
      view,
      year: clock.y,
      month: clock.m,
      day: clock.d,
      mode: "month",
      heatYear: clock.y,
      limit: 10,
      ...(department === null ? {} : { dept: department }),
      ...extra,
    };
    return api(who, "/api/" + domain + "?" + new URLSearchParams(params));
  };
  return { DB, W, env, users, permissions, clock, put, api, read, whoId };
}

test("owner with absent/empty department registry gets domain403 for invented d1 on all records and dashboards without mutation or data", async (t) => {
  for (const empty of ["absent", "array"]) {
    const B = await world({ registered: false, seed: false });
    try {
      if (empty === "array") await B.put("bassam_depts_v1", []);
      const before = businessSnapshot(B.DB);
      for (const [domain, views] of Object.entries(DOMAIN_VIEWS))
        for (const view of views)
          denied(await B.read(domain, view, "d1"), domain);
      assert.deepEqual(businessSnapshot(B.DB), before);
      assert.deepEqual(B.DB.q("PRAGMA foreign_key_check"), []);
    } finally {
      B.DB.db.close();
    }
  }
});

test("missing IR/Seized department is a scope400, while existing explicit Award global reference/context contract stays read-only", async (t) => {
  const B = await world({ registered: false, seed: false });
  t.after(() => B.DB.db.close());
  const before = businessSnapshot(B.DB);
  for (const domain of ["irshad", "seized"]) {
    const response = await B.read(domain, "records", null);
    assert.equal(response.status, 400);
    assert.equal(response.json.err, domain + "-scope");
  }
  for (const view of ["references", "context"]) {
    const value = ok(
      await B.read("award", view, null, "owner", { scope: "global" }),
    );
    assert.equal(value.scope, "global");
    assert.equal(value.dept, "");
  }
  const invalid = await B.read("award", "records", null, "owner", {
    scope: "global",
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.json.err, "award-view");
  assert.deepEqual(businessSnapshot(B.DB), before);
});

test("valid registered departments let the real super read all domain views with records and dashboard isolation", async (t) => {
  const B = await world();
  t.after(() => B.DB.db.close());
  const before = businessSnapshot(B.DB);
  for (const department of [ONE, TWO])
    for (const [domain, views] of Object.entries(DOMAIN_VIEWS))
      for (const view of views) {
        const value = ok(await B.read(domain, view, department)),
          other = department === ONE ? TWO : ONE;
        assert.equal(value.dept, department);
        assert.ok(
          !JSON.stringify(value).includes("TEST_ONLY_PRIVATE_" + other),
        );
        if (view === "records") assert.equal(value.total, 1, domain);
        if (view === "dashboard") {
          assert.equal(value.dashboard.available.total, 1, domain);
          assert.equal(value.dashboard.totals.reports, 1, domain);
        }
      }
  assert.deepEqual(businessSnapshot(B.DB), before);
  assert.deepEqual(B.DB.q("PRAGMA foreign_key_check"), []);
});

test("removing a department registry invalidates captured owner read/write context without touching typed data, identities or policy", async (t) => {
  const B = await world();
  t.after(() => B.DB.db.close());
  const bases = {};
  for (const domain of Object.keys(DOMAIN_VIEWS))
    bases[domain] = ok(
      await B.read(domain, domain === "award" ? "context" : "catalogs"),
    ).base;
  B.DB.db.prepare("DELETE FROM kv WHERE k='bassam_depts_v1'").run();
  B.W.preOff(B.env);
  const before = businessSnapshot(B.DB);
  for (const domain of Object.keys(DOMAIN_VIEWS)) {
    denied(await B.read(domain, "records"), domain);
    const operation =
      domain === "award"
        ? { op: "delete", id: "TEST_ONLY_PRIVATE_" + ONE + "_record" }
        : domain === "irshad"
          ? { op: "catalog-replace", kind: "locations", values: [] }
          : { op: "catalog-replace", kind: "locations", value: [] };
    denied(
      await B.api("owner", "/api/" + domain + "/act", {
        uid: B.whoId("owner"),
        dept: ONE,
        requestId: "TEST_ONLY_STALE_CONTEXT_" + domain,
        base: bases[domain],
        ...operation,
      }),
      domain,
    );
  }
  assert.deepEqual(businessSnapshot(B.DB), before);
  assert.deepEqual(B.DB.q("PRAGMA foreign_key_check"), []);
});

test("limited real staff read their registered department only; foreign and no-view reads return403 without leaking records or totals", async (t) => {
  const B = await world();
  t.after(() => B.DB.db.close());
  const before = businessSnapshot(B.DB);
  for (const domain of Object.keys(DOMAIN_VIEWS)) {
    for (const view of [
      "records",
      ...(domain === "award" ? [] : ["dashboard"]),
    ]) {
      const own = ok(await B.read(domain, view, ONE, "staff"));
      assert.equal(own.dept, ONE);
      assert.ok(!JSON.stringify(own).includes("TEST_ONLY_PRIVATE_" + TWO));
      if (view === "records") assert.equal(own.total, 1, domain);
      if (view === "dashboard")
        assert.equal(own.dashboard.totals.reports, 1, domain);
      denied(await B.read(domain, view, TWO, "staff"), domain);
      denied(await B.read(domain, view, ONE, "noView"), domain);
    }
  }
  assert.deepEqual(businessSnapshot(B.DB), before);
});

test("old query UID cannot reuse a valid owner session on any domain, even when its department is valid", async (t) => {
  const B = await world();
  t.after(() => B.DB.db.close());
  const before = businessSnapshot(B.DB);
  for (const domain of Object.keys(DOMAIN_VIEWS)) {
    const response = await B.read(domain, "records", ONE, "owner", {
      uid: B.whoId("staff"),
    });
    assert.equal(response.status, 409);
    assert.equal(response.json.err, "session-changed");
    assert.ok(!JSON.stringify(response.json).includes("TEST_ONLY_PRIVATE_"));
  }
  assert.deepEqual(businessSnapshot(B.DB), before);
});
