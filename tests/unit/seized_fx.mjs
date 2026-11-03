/* Actual canonical schema10 Worker only. Synthetic SQLite; no stage/cache DDL fallback. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { D1Shim, ROOT } from "./harness.mjs";
import {
  installOperationalFixture,
  isOperationalFixtureKey,
  replaceOperationalFixture,
} from "./operational_legacy_seed_fx.mjs";
export { ROOT };
let canonical;
export const testedMode = "canonical";
export async function seizedWorker() {
  if (!canonical) {
    const worker = fs.readFileSync(
        path.join(ROOT, "workers/_worker.js"),
        "utf8",
      ),
      manifest = JSON.parse(
        fs.readFileSync(path.join(ROOT, "workers/parts.json"), "utf8"),
      );
    assert.equal(
      createHash("sha256").update(worker).digest("hex"),
      manifest.sha256,
      "Use the actual canonical generated Worker",
    );
    const source = manifest.parts
      .map((part) => {
        const bytes = fs.readFileSync(
          path.join(ROOT, "workers/parts", part.file),
          "utf8",
        );
        assert.equal(
          createHash("sha256").update(bytes).digest("hex"),
          part.sha256,
          "Generate canonical parts before the Seized tests: " + part.file,
        );
        return bytes;
      })
      .join("");
    assert.equal(
      source,
      worker,
      "Canonical parts and generated Worker must agree byte for byte",
    );
    for (const name of [
      "019l-seized.js",
      "019l-seized-query.js",
      "019l-seized-dashboard.js",
      "019l-seized-operations.js",
    ])
      assert.ok(
        manifest.parts.some((part) => part.file === name),
        "Canonical Seized part is registered: " + name,
      );
    canonical = import(
      "data:text/javascript;base64," +
        Buffer.from(
          worker +
            "\nexport {SZ_RES,SZ_NAMES,SZ_TABLES,SZ_REQUEST_COLS,szConvert,szInflate,szEmptyDomain,szValidateDomain,szInstallStatements,szDomainPlan,szLegacyPrepare,szExportDomain,szRetroSnapshot,szRetroStatements,szRevs,szRevisionGuards,szRetiredGuard,szQueryContext,szQueryScope,hSeizedGet,hSeizedAct,szPermission,szDayContext,enfViewCtx,ENF_PROJ,actorOf,kvPutStmts,preOff,cuClock,initDb,migrateDb,KIVO_MIGRATIONS,KIVO_SCHEMA_VERSION,MIG_TABLE};\n//# sourceURL=canonical-seized-domain.mjs",
        ).toString("base64")
    ).then((module) => {
      assert.equal(module.KIVO_SCHEMA_VERSION, 10);
      assert.equal(module.KIVO_MIGRATIONS.length, 10);
      // Test-only inspection convenience, not a production Worker export.
      return Object.freeze({
        ...module,
        szDomainState: async function (env, d) {
          const domain = await module.szExportDomain(env, d),
            snapshotRows = {
              ...domain.rows,
              requests:
                (
                  await env.DB.prepare(
                    "SELECT * FROM seized_requests WHERE department_id=?1",
                  )
                    .bind(d)
                    .all()
                ).results || [],
            };
          return { domain, snapshotRows, revs: await module.szRevs(env, d) };
        },
      });
    });
  }
  return canonical;
}
export async function seizedWorld({ install = true } = {}) {
  const W = await seizedWorker(),
    DB = new D1Shim(),
    env = { DB };
  if (install) await W.migrateDb(env);
  else {
    DB.exec(W.MIG_TABLE);
    for (const m of W.KIVO_MIGRATIONS.slice(0, 8)) {
      for (const sql of m.sql) DB.exec(sql);
      DB.db.prepare("INSERT INTO d1_migrations(name)VALUES(?)").run(m.name);
    }
  }
  DB.exec("PRAGMA foreign_keys=ON");
  return { W, DB, env };
}
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const snapshot = (B) =>
  Object.fromEntries(
    Object.values(B.W.SZ_TABLES)
      .map(([table]) => [table, clone(B.DB.q("SELECT * FROM " + table))])
      .concat([
        ["seized_requests", clone(B.DB.q("SELECT * FROM seized_requests"))],
        ["kv", clone(B.DB.q("SELECT * FROM kv"))],
        ["meta", clone(B.DB.q("SELECT * FROM meta"))],
      ]),
  );
let serial = 0;
export const DEPT = "TEST_ONLY_seized_dept",
  OTHER = "TEST_ONLY_seized_other";
export async function put(B, k, value) {
  /* Schema 10: operational resources (employees, dreport, shift options, ...) are typed SQL, never KV.
     Before installOperationalFixture has run its canonical cutover on this env, every key (operational ones
     included) is seeded as the KV source that cutover converts; once the env is registered, operational
     resources go only through the canonical typed writer (a later legacy KV row would be refused by
     opGuardRetired as operations-legacy-source-present). */
  if (isOperationalFixtureKey(B.env, k)) {
    await replaceOperationalFixture(B.env, k, value);
    B.W.preOff(B.env);
    return;
  }
  await B.DB.batch(
    B.W.kvPutStmts(B.env, "kv", k, JSON.stringify(value)).concat([
      B.DB.prepare(
        "INSERT INTO revs(k,rev)VALUES(?1,1)ON CONFLICT(k)DO UPDATE SET rev=rev+1",
      ).bind(k),
    ]),
  );
  B.W.preOff(B.env);
}
export async function commandWorld({ mode = "enforce" } = {}) {
  const B = await seizedWorld();
  if (mode === "enforce") B.env.KIVO_AUTHZ_MODE = "enforce";
  const users = [
    {
      id: "TEST_ONLY_super",
      un: "1000000001",
      name: "TEST_ONLY owner",
      role: "super",
    },
    {
      id: "TEST_ONLY_staff",
      un: "1000000002",
      name: "TEST_ONLY employee",
      role: "staff",
      deptId: DEPT,
      ekey: "TEST_ONLY_E1",
    },
    {
      id: "TEST_ONLY_denied",
      un: "1000000003",
      name: "TEST_ONLY denied",
      role: "staff",
      deptId: DEPT,
      ekey: "TEST_ONLY_E2",
    },
  ];
  const keys = {
    bassam_auth_users_v1: users,
    bassam_depts_v1: [
      { id: DEPT, name: DEPT },
      { id: OTHER, name: OTHER },
    ],
    bassam_gdepts_v1: [],
    bassam_perms_v1: {
      caps: {
        [DEPT]: ["seized", "emps", "daily", "dreport", "staff"],
        [OTHER]: ["seized"],
      },
      emps: {
        [DEPT]: {
          TEST_ONLY_E1: {
            "seized/records": ["view", "add", "edit", "del"],
            "seized/dash": ["view"],
          },
          TEST_ONLY_E2: {},
        },
      },
    },
    bassam_platform_v1: {},
    ["bsdept:" + DEPT + ":bassam_employees_v1"]: [
      { eid: "TEST_ONLY_E1", nid: "1000000002", name: "TEST_ONLY employee" },
    ],
  };
  for (const [k, v] of Object.entries(keys)) await put(B, k, v);
  /* Canonical schema-10 cutover of the KV-seeded operational keys; it must run here (not be skipped as
     already-registered) so its preservation, retired-source, cutover-ready and foreign-key checks apply. */
  const cutover = await installOperationalFixture(B.env);
  assert.equal(cutover.already, undefined, "Operational cutover runs once, after every seed key is written");
  assert.ok(cutover.documents > 0, "The KV-seeded roster is converted by the canonical cutover");
  if (mode === "enforce")
    B.DB.db
      .prepare(
        "INSERT INTO meta(k,v)VALUES('authz_mode','enforce')ON CONFLICT(k)DO UPDATE SET v=excluded.v",
      )
      .run();
  const catalogs = {
    catalog: {
      ver: 1,
      cats: [
        {
          name: "TEST_ONLY cash",
          color: "#123456",
          items: [
            { id: 23, name: "TEST_ONLY money", unit: "sar" },
            { id: 24, name: "TEST_ONLY jewelry", unit: "pcval" },
          ],
        },
      ],
    },
    actions: [
      { k: "sto", name: "TEST_ONLY stored" },
      { k: "sec", name: "TEST_ONLY security" },
    ],
    locations: ["TEST_ONLY location"],
    jew: ["TEST_ONLY kind"],
  };
  await B.DB.batch(
    B.W.szInstallStatements(B.env, B.W.szConvert(DEPT, catalogs)),
  );
  const actor = (who = "super") => B.W.actorOf(B.env, "TEST_ONLY_" + who),
    base = async (who = "super") =>
      clone(
        (
          await B.W.szQueryContext(B.env, await actor(who), DEPT, {
            write: true,
          })
        ).base,
      ),
    body = async (op, extra = {}, who = "super") => ({
      uid: "TEST_ONLY_" + who,
      dept: DEPT,
      requestId: "TEST_ONLY_sz_command_" + ++serial,
      base: await base(who),
      op,
      reason: "TEST_ONLY reviewed change",
      ...extra,
    }),
    act = async (b, who = "super") =>
      B.W.hSeizedAct(B.env, await actor(who), b, {
        ip: "TEST_ONLY",
        dev: "TEST_ONLY",
      }),
    read = async (q = {}, who = "super") =>
      B.W.hSeizedGet(B.env, await actor(who), {
        dept: DEPT,
        view: "records",
        ...B.W.cuClock(),
        year: B.W.cuClock().y,
        month: B.W.cuClock().m,
        ...q,
      });
  return Object.assign(B, {
    users,
    keys,
    catalogs,
    actor,
    base,
    body,
    act,
    read,
    today: B.W.cuClock(),
  });
}
export function reportData(B, patch = {}) {
  return {
    ...B.today,
    loc: "TEST_ONLY location",
    no: "TEST_ONLY document",
    note: "",
    items: [
      { id: 23, n: 100, val: 0, act: "sto", kind: "", kindTxt: "", photos: [] },
    ],
    ...patch,
  };
}
