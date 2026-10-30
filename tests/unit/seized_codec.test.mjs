import { test } from "node:test";
import assert from "node:assert/strict";
import { seizedWorker, seizedWorld, clone, snapshot } from "./seized_fx.mjs";
const d = "TEST_ONLY_seized_dept";
const docs = () => ({
  reports: {
    reports: [
      {
        id: "TEST_ONLY_report",
        y: 1448,
        m: 2,
        d: 3,
        ts: 1234,
        loc: "TEST_ONLY_loc",
        actor: "TEST_ONLY_snapshot",
        actorKey: "TEST_ONLY_removed_user",
        no: "",
        note: null,
        items: [
          {
            id: 23,
            n: 100,
            val: 0,
            act: "sto",
            kind: "",
            kindTxt: "",
            photos: ["szp_test_only", "szp_test_only"],
            hist: [
              {
                from: "sec",
                to: "sto",
                at: "TEST_ONLY_time",
                by: "TEST_ONLY_actor",
                t: 123,
              },
            ],
          },
          { id: "TEST_ONLY_string_id", n: 2, photos: null, hist: [] },
        ],
      },
    ],
  },
  catalog: {
    ver: "TEST_ONLY_version",
    cats: [
      {
        name: "TEST_ONLY_cat",
        color: "#123456",
        def: "sto",
        items: [
          { id: 23, name: "TEST_ONLY_cash", desc: "", unit: "sar" },
          {
            id: "TEST_ONLY_string_id",
            name: "TEST_ONLY_legacy",
            unit: "pcval",
          },
        ],
      },
    ],
  },
  actions: [{ k: "sto", name: "TEST_ONLY_store", color: "#475569" }],
  locations: ["", "TEST_ONLY_loc", "TEST_ONLY_loc"],
  jew: ["TEST_ONLY_kind"],
  retro: {
    v: 1,
    windows: [
      {
        id: "TEST_ONLY_window",
        scope: { y: 1448, m: 1, d: null },
        at: 100,
        until: 200,
        hours: 1,
        reason: "TEST_ONLY",
        reasonMissing: false,
        by: {
          id: "TEST_ONLY_user",
          un: "TEST_ONLY_un",
          ekey: "",
          name: "TEST_ONLY_snapshot",
        },
        closedAt: 150,
        closedBy: { id: "TEST_ONLY_user", un: "TEST_ONLY_un", ekey: "" },
      },
    ],
  },
});
const base = () =>
  Object.fromEntries(
    ["reports", "catalog", "actions", "locations", "jew", "retro"].map((n) => [
      n,
      0,
    ]),
  );
test("canonical seized codec round-trips every business resource, nested multi-items/photos/history and historical snapshots exactly", async () => {
  const W = await seizedWorker(),
    input = docs(),
    domain = W.szConvert(d, input);
  assert.deepEqual(W.szInflate(domain), input);
  assert.deepEqual(W.szValidateDomain(domain, d), domain);
  assert.equal(
    Object.values(domain.rows)
      .flat()
      .some((r) => Object.hasOwn(r, "json") || Object.hasOwn(r, "raw")),
    false,
  );
});
test("seized absent/null/empty resources and child lists remain distinct; no defaults are silently seeded", async () => {
  const W = await seizedWorker();
  for (const input of [
    {},
    {
      reports: null,
      catalog: null,
      actions: null,
      locations: null,
      jew: null,
      retro: null,
    },
    {
      reports: {},
      catalog: {},
      actions: [],
      locations: [],
      jew: [],
      retro: {},
    },
    {
      reports: { reports: [{ id: "TEST_ONLY", items: null }] },
      catalog: { ver: null, cats: null },
      actions: [],
      retro: { v: null },
    },
    {
      reports: {
        reports: [
          {
            id: "TEST_ONLY",
            items: [{ id: null, photos: null, hist: null }, {}],
          },
        ],
      },
      catalog: { ver: 1, cats: [{ name: "TEST_ONLY", items: null }] },
      retro: { windows: [] },
    },
  ])
    assert.deepEqual(
      W.szInflate(W.szValidateDomain(W.szConvert(d, input), d)),
      input,
    );
});
test("unknown seized legacy fields and ambiguous report/catalog/action identities are rejected without guessing", async () => {
  const W = await seizedWorker(),
    changes = [
      (x) => (x.reports.extra = "TEST_ONLY"),
      (x) => (x.reports.reports[0].unknown = "TEST_ONLY"),
      (x) => (x.reports.reports[0].items[0].unknown = true),
      (x) => (x.reports.reports[0].items[0].hist[0].unknown = 1),
      (x) =>
        x.catalog.cats[0].items.push({ id: "23", name: "TEST_ONLY_collision" }),
      (x) => x.catalog.cats.push({ name: "TEST_ONLY_cat" }),
      (x) => x.actions.push({ k: "sto", name: "TEST_ONLY_duplicate" }),
      (x) => x.reports.reports.push(clone(x.reports.reports[0])),
    ];
  for (const change of changes) {
    const input = docs();
    change(input);
    assert.throws(() => W.szConvert(d, input));
  }
});
test("typed seized domain rejects masks, orphan children, forged columns and changed null/scalar types", async () => {
  const W = await seizedWorker(),
    input = W.szConvert(d, docs()),
    changes = [
      (x) => (x.rows.reports[0].presence_mask = 0),
      (x) => (x.rows.items[0].report_id = "TEST_ONLY_orphan"),
      (x) => (x.rows.photos[0].item_position = 999),
      (x) => (x.rows.categories[0].unknown = "TEST_ONLY"),
      (x) => (x.rows.history[0].created_at = "123"),
      (x) => (x.rows.resources[0].value_kind = 99),
      (x) => (x.rows.catalogItems[0].id_kind = 3),
      (x) => x.rows.resources.pop(),
    ];
  for (const change of changes) {
    const domain = clone(input);
    change(domain);
    assert.throws(() => W.szValidateDomain(domain, d));
  }
});
test("seized report and retro sequence gaps survive export validation; negative and duplicate sequences fail", async () => {
  const W = await seizedWorker(),
    domain = W.szConvert(d, docs());
  domain.rows.reports[0].sequence = 9;
  domain.rows.windows[0].sequence = 7;
  const valid = W.szValidateDomain(domain, d);
  assert.equal(valid.rows.reports[0].sequence, 9);
  assert.equal(valid.rows.windows[0].sequence, 7);
  for (const value of [-1, Infinity, 1.5]) {
    const copy = clone(domain);
    copy.rows.reports[0].sequence = value;
    assert.throws(() => W.szValidateDomain(copy, d));
  }
});
test("typed seized install/export is relational with valid FK relationships and no operational KV document", async (t) => {
  const B = await seizedWorld();
  t.after(() => B.DB.db.close());
  const domain = B.W.szConvert(d, docs());
  await B.DB.batch(B.W.szInstallStatements(B.env, domain));
  assert.deepEqual(B.W.szInflate(await B.W.szExportDomain(B.env, d)), docs());
  assert.deepEqual(B.DB.q("PRAGMA foreign_key_check"), []);
  assert.equal(
    B.DB.q("SELECT COUNT(*)n FROM kv WHERE k GLOB '*bassam_seized*'")[0].n,
    0,
  );
});
test("unknown legacy JSON fails before seized DDL/data writes and does not create missing typed tables", async (t) => {
  const B = await seizedWorld({ install: false });
  t.after(() => B.DB.db.close());
  B.DB.db
    .prepare("INSERT INTO kv(k,seq,v)VALUES(?,0,?)")
    .run("bassam_depts_v1", JSON.stringify([{ id: d }]));
  const input = docs().reports;
  input.reports[0].unknown = "TEST_ONLY";
  B.DB.db
    .prepare("INSERT INTO kv(k,seq,v)VALUES(?,0,?)")
    .run("bsdept:" + d + ":bassam_seized_v1", JSON.stringify(input));
  await assert.rejects(B.W.szLegacyPrepare(B.env));
  assert.equal(
    B.DB.q("SELECT COUNT(*)n FROM sqlite_master WHERE name GLOB 'seized_*'")[0]
      .n,
    0,
  );
  assert.equal(
    B.DB.q("SELECT COUNT(*)n FROM meta WHERE k='seized_cutover_ready'")[0].n,
    0,
  );
});
test("unchanged empty seized restore plan has no DML and detects a late raw typed writer without revision bump", async (t) => {
  const B = await seizedWorld();
  t.after(() => B.DB.db.close());
  const plan = await B.W.szDomainPlan(B.env, B.W.szEmptyDomain(d), d, {
    base: base(),
  });
  assert.equal(plan.changed, false);
  assert.equal(plan.statements.length, 0);
  assert.ok(plan.guards.length <= 3);
  B.DB.db
    .prepare(
      "INSERT INTO seized_reports(department_id,report_id,sequence,presence_mask,items_kind)VALUES(?,?,0,1,0)",
    )
    .run(d, "TEST_ONLY_foreign");
  const before = snapshot(B);
  await assert.rejects(B.DB.batch(plan.guards));
  assert.deepEqual(snapshot(B), before);
});
test("seized restore plan fences raw legacy reintroduction and rolls back every typed change on late SQL error", async (t) => {
  const B = await seizedWorld();
  t.after(() => B.DB.db.close());
  const plan = await B.W.szDomainPlan(B.env, B.W.szConvert(d, docs()), d, {
      base: base(),
    }),
    before = snapshot(B);
  await assert.rejects(
    B.DB.batch(
      plan.guards.concat(plan.statements, [
        B.DB.prepare("INSERT INTO TEST_ONLY_missing_table VALUES(1)"),
      ]),
    ),
  );
  assert.deepEqual(snapshot(B), before);
  B.DB.db
    .prepare("INSERT INTO kv(k,seq,v)VALUES(?,0,?)")
    .run("bsdept:" + d + ":bassam_seized_v1:TEST_ONLY_child", "{}");
  const foreign = snapshot(B);
  await assert.rejects(B.DB.batch(plan.guards.concat(plan.statements)));
  assert.deepEqual(snapshot(B), foreign);
});

test("seized pre-DDL preparation rejects unknown departments/unscoped resources/chunk gaps without writes", async (t) => {
  for (const [key, seq] of [
    ["bsdept:TEST_ONLY_unregistered:bassam_seized_v1", 0],
    ["bassam_seized_v1", 0],
    ["bsdept:" + d + ":bassam_seized_v1", 1],
  ]) {
    const B = await seizedWorld({ install: false });
    t.after(() => B.DB.db.close());
    B.DB.db
      .prepare("INSERT INTO kv(k,seq,v)VALUES(?,0,?)")
      .run("bassam_depts_v1", JSON.stringify([{ id: d }]));
    B.DB.db
      .prepare("INSERT INTO kv(k,seq,v)VALUES(?,?,?)")
      .run(key, seq, JSON.stringify(docs().reports));
    const before = B.DB.q("SELECT * FROM kv");
    await assert.rejects(B.W.szLegacyPrepare(B.env));
    assert.deepEqual(B.DB.q("SELECT * FROM kv"), before);
    assert.equal(
      B.DB.q(
        "SELECT COUNT(*)n FROM sqlite_master WHERE name GLOB 'seized_*'",
      )[0].n,
      0,
    );
  }
});
test("seized domain restore preserves sparse sequence/history after deleting first report and clears only internal receipts", async (t) => {
  const { commandWorld, reportData, DEPT } = await import("./seized_fx.mjs"),
    B = await commandWorld();
  t.after(() => B.DB.db.close());
  const a = await B.act(await B.body("create", { data: reportData(B) })),
    b = await B.act(await B.body("create", { data: reportData(B) }));
  await B.act(await B.body("delete", { id: a.id }));
  const state = await B.W.szDomainState(B.env, DEPT),
    domain = state.domain;
  assert.equal(domain.rows.reports[0].sequence, 1);
  assert.equal(domain.rows.reports[0].report_id, b.id);
  assert.equal(state.snapshotRows.requests.length, 3);
  const plan = await B.W.szDomainPlan(B.env, domain, DEPT, {
    base: state.revs,
  });
  assert.equal(plan.changed, true);
  assert.equal(plan.imageProjection, undefined);
  await B.DB.batch(plan.guards.concat(plan.statements));
  assert.deepEqual(await B.W.szExportDomain(B.env, DEPT), domain);
  assert.equal(B.DB.q("SELECT COUNT(*)n FROM seized_requests")[0].n, 0);
  assert.equal(B.DB.q("SELECT COUNT(*)n FROM aud")[0].n, 3);
  assert.deepEqual(B.DB.q("PRAGMA foreign_key_check"), []);
});

test("seized identical business restore clears only receipts and rolls their deletion back on late SQL failure", async (t) => {
  const { commandWorld, reportData, DEPT } = await import("./seized_fx.mjs"),
    B = await commandWorld();
  t.after(() => B.DB.db.close());
  const image = "szp_test_same";
  B.DB.db
    .prepare("INSERT INTO imgs(k,seq,v)VALUES(?,0,'TEST_ONLY image')")
    .run(image);
  B.DB.db
    .prepare(
      "INSERT INTO imgown(img,st,k,uid,dept,ts)VALUES(?,'claim','','TEST_ONLY_super','',1)",
    )
    .run(image);
  const data = reportData(B);
  data.items[0].photos = [image];
  await B.act(await B.body("create", { data }));
  const imageBefore = {
    refs: clone(B.DB.q("SELECT * FROM imgref")),
    owners: clone(B.DB.q("SELECT * FROM imgown")),
  };
  const state = await B.W.szDomainState(B.env, DEPT),
    plan = await B.W.szDomainPlan(B.env, state.domain, DEPT, {
      base: state.revs,
    });
  assert.equal(plan.changed, true);
  assert.equal(
    plan.imageProjection,
    undefined,
    "Identical images must not schedule metadata DML",
  );
  assert.deepEqual(plan.revisionKeys, []);
  assert.equal(plan.statements.length, 1);
  assert.match(
    plan.statements[0].sql,
    /^DELETE FROM seized_requests WHERE department_id=\?1$/,
  );
  const before = snapshot(B);
  await assert.rejects(
    B.DB.batch(
      plan.guards.concat(plan.statements, [
        B.DB.prepare("INSERT INTO TEST_ONLY_missing_table VALUES(1)"),
      ]),
    ),
  );
  assert.deepEqual(snapshot(B), before);
  await B.DB.batch(plan.guards.concat(plan.statements));
  assert.deepEqual(await B.W.szExportDomain(B.env, DEPT), state.domain);
  assert.equal(B.DB.q("SELECT COUNT(*)n FROM seized_requests")[0].n, 0);
  assert.deepEqual(plan.snapshotRows.requests, state.snapshotRows.requests);
  assert.deepEqual(
    {
      refs: clone(B.DB.q("SELECT * FROM imgref")),
      owners: clone(B.DB.q("SELECT * FROM imgown")),
    },
    imageBefore,
  );
});
