import { test } from "node:test";
import assert from "node:assert/strict";
import { commandWorld, reportData, clone, put, DEPT } from "./seized_fx.mjs";
test("seized SQL calendar/records/facets preserve money quantity and bounded paging/search semantics", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  for (const loc of ["TEST_ONLY location", "TEST_ONLY free location"])
    await B.act(
      await B.body("create", {
        data: reportData(B, {
          loc,
          items: [
            {
              id: 23,
              n: 100,
              val: 0,
              act: "sto",
              kind: "",
              kindTxt: "",
              photos: [],
            },
            {
              id: 24,
              n: 2,
              val: 300,
              act: "sec",
              kind: "TEST_ONLY kind",
              kindTxt: "",
              photos: [],
            },
          ],
        }),
      }),
    );
  const page = await B.read({ limit: 1 });
  assert.equal(page.rows.length, 1);
  assert.equal(page.monthTotals.reports, 2);
  assert.equal(page.monthTotals.qty, 6);
  assert.equal(page.monthTotals.sar, 800);
  assert.equal(page.monthTotals.actions.sec, 4);
  assert.deepEqual(page.facets.locations, [
    "TEST_ONLY free location",
    "TEST_ONLY location",
  ]);
  assert.ok(page.next);
  const next = await B.read({ limit: 1, cursor: page.next });
  assert.notEqual(next.rows[0].id, page.rows[0].id);
  assert.equal(
    (
      await B.read({
        q: "TEST_ONLY jewelry",
        category: "TEST_ONLY cash",
        action: "sec",
      })
    ).total,
    2,
  );
  assert.equal((await B.read({ loc: "TEST_ONLY free location" })).total, 1);
});
test("seized dashboard SQL reports complete totals/groups/distinct employees and preserves selected-year heat", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  await B.act(await B.body("create", { data: reportData(B) }));
  const r = await B.read({
      view: "dashboard",
      mode: "month",
      year: B.today.y,
      month: B.today.m,
    }),
    d = r.dashboard;
  assert.equal(d.totals.reports, 1);
  assert.equal(d.totals.qty, 1);
  assert.equal(d.totals.sar, 100);
  assert.equal(d.totals.employees, 1);
  assert.equal(d.totals.actions.sto, 1);
  assert.equal(d.categories[0].value, 1);
  assert.equal(d.locations[0].value, 1);
  assert.equal(d.employees[0].name, "TEST_ONLY owner");
  assert.equal(d.heat[0].qty, 1);
  assert.equal(d.available.first.d, B.today.d);
});
test("seized records retain canonical ACL and existing locked/self view across counts/facets/search/month delete", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const permissions = clone(B.keys.bassam_perms_v1);
  delete permissions.emps[DEPT].TEST_ONLY_E1["seized/dash"];
  await put(B, "bassam_perms_v1", permissions);
  await put(B, "bsdept:" + DEPT + ":bassam_grants_v1", {
    v: 1,
    emp: {
      TEST_ONLY_E1: {
        plus: ["sz.rec.bulk.delete", "sz.rec.delete"],
        minus: [],
      },
    },
  });
  await put(B, "bsdept:" + DEPT + ":bassam_scope_v1", {
    ceiling: { Site: { mode: "ALL" }, "Zone/Element": { mode: "ALL" } },
    emp: {
      TEST_ONLY_E1: { Shift: { mode: "list", list: ["TEST_ONLY visible"] } },
    },
  });
  const domain = B.W.szConvert(DEPT, {
    reports: {
      reports: [
        {
          id: "TEST_ONLY_visible",
          ...reportData(B),
          actorKey: "TEST_ONLY_E1",
          shift: "TEST_ONLY visible",
          ts: 1,
        },
        {
          id: "TEST_ONLY_hidden",
          ...reportData(B),
          actorKey: "TEST_ONLY_other_actor",
          loc: "TEST_ONLY foreign location",
          shift: "TEST_ONLY hidden",
          ts: 2,
        },
      ],
    },
  });
  await B.DB.batch(B.W.szInstallStatements(B.env, domain));
  const ctx = await B.W.szQueryContext(B.env, await B.actor("staff"), DEPT),
    V = B.W.enfViewCtx(ctx.A, DEPT, "bassam_seized_v1", ctx.refs);
  assert.equal(
    V.restrict.Shift,
    false,
    "Keep the actual seized read-key dimensions; do not invent Irshad Shift policy",
  );
  const own = await B.read({}, "staff");
  assert.deepEqual(
    own.rows.map((r) => r.id),
    ["TEST_ONLY_visible"],
  );
  assert.equal(own.monthTotals.reports, 1);
  assert.deepEqual(own.facets.locations, ["TEST_ONLY location"]);
  assert.equal((await B.read({ q: "foreign location" }, "staff")).total, 0);
  assert.equal(
    (await B.read({ view: "dashboard" }, "staff")).dashboard.totals.reports,
    2,
    "Dashboard keeps the canonical ACL without the records-only self filter",
  );
  await B.act(
    await B.body(
      "delete-month",
      { year: B.today.y, month: B.today.m },
      "staff",
    ),
    "staff",
  );
  assert.deepEqual(
    B.DB.q("SELECT report_id FROM seized_reports").map((r) => r.report_id),
    ["TEST_ONLY_hidden"],
  );
});
test("seized catalog presentation matches original default loaders while explicit raw null/empty values remain lossless", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  B.DB.exec(
    "DELETE FROM seized_catalog_items;DELETE FROM seized_categories;DELETE FROM seized_actions;DELETE FROM seized_list_values;DELETE FROM seized_resource_state",
  );
  const before = B.DB.q("SELECT * FROM kv"),
    absent = await B.read({ view: "catalogs" });
  assert.equal(absent.catalogs.catalog.present, false);
  assert.ok(absent.catalogs.catalog.value.cats.length > 0);
  assert.deepEqual(B.DB.q("SELECT * FROM kv"), before);
  await B.DB.batch(
    B.W.szInstallStatements(
      B.env,
      B.W.szConvert(DEPT, {
        catalog: { ver: 1, cats: [] },
        actions: [],
        locations: [],
        jew: [],
      }),
    ),
  );
  const empty = await B.read({ view: "catalogs" });
  assert.deepEqual(empty.catalogs.catalog.value, absent.catalogs.catalog.value);
  assert.deepEqual(empty.catalogs.actions.value, absent.catalogs.actions.value);
  assert.deepEqual(empty.catalogs.jew.value, absent.catalogs.jew.value);
  assert.equal(empty.catalogs.catalog.present, true);
  assert.deepEqual(B.W.szInflate(await B.W.szExportDomain(B.env, DEPT)), {
    catalog: { ver: 1, cats: [] },
    actions: [],
    locations: [],
    jew: [],
  });
  await B.DB.batch(
    B.W.szInstallStatements(
      B.env,
      B.W.szConvert(DEPT, {
        reports: {
          reports: [{ id: "TEST_ONLY_default_sar", ...reportData(B) }],
        },
      }),
    ),
  );
  const stats = await B.read({ view: "calendar" });
  assert.equal(stats.monthTotals.qty, 1);
  assert.equal(stats.monthTotals.sar, 100);
  for (const raw of [
    { catalog: null, actions: null, locations: null, jew: null },
    { catalog: {}, actions: [], locations: [], jew: [] },
  ]) {
    B.DB.exec(
      "DELETE FROM seized_catalog_items;DELETE FROM seized_categories;DELETE FROM seized_actions;DELETE FROM seized_list_values;DELETE FROM seized_resource_state WHERE resource IN('catalog','actions','locations','jew')",
    );
    await B.DB.batch(B.W.szInstallStatements(B.env, B.W.szConvert(DEPT, raw)));
    const shown = await B.read({ view: "catalogs" }),
      stored = B.W.szInflate(await B.W.szExportDomain(B.env, DEPT));
    for (const key of Object.keys(raw)) assert.deepEqual(stored[key], raw[key]);
    assert.deepEqual(
      shown.catalogs.catalog.value,
      absent.catalogs.catalog.value,
    );
    assert.deepEqual(
      shown.catalogs.actions.value,
      absent.catalogs.actions.value,
    );
    assert.deepEqual(shown.catalogs.jew.value, absent.catalogs.jew.value);
    assert.deepEqual(shown.catalogs.locations.value, []);
    assert.equal((await B.read({ view: "calendar" })).monthTotals.sar, 100);
  }
  B.DB.exec(
    "DELETE FROM seized_list_values WHERE resource='jew';DELETE FROM seized_resource_state WHERE resource='jew'",
  );
  await B.DB.batch(
    B.W.szInstallStatements(B.env, B.W.szConvert(DEPT, { jew: ["", "أخرى"] })),
  );
  assert.deepEqual(
    (await B.read({ view: "catalogs" })).catalogs.jew.value,
    [],
    "A nonempty raw kind array is filtered once, without a second default fallback",
  );
});
test("seized day context exposes minimal current projected references and no user credentials/raw references", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const key = B.today.y + "-" + B.today.m + "-" + B.today.d;
  await put(B, "bsdept:" + DEPT + ":bassam_dreport_v1", {
    [key]: {
      shifts: {
        "TEST_ONLY shift": {
          pulled: true,
          roster: [{ ekey: "TEST_ONLY_E1", name: "TEST_ONLY roster" }],
          leaders: { chief: "TEST_ONLY employee", deputy: "" },
        },
      },
    },
  });
  const result = await B.read({ view: "context", day: B.today.d });
  assert.equal(result.context.rep, true);
  assert.equal(
    result.context.rows["TEST_ONLY shift"][0].name,
    "TEST_ONLY employee",
  );
  assert.equal(result.context.dayShift, "TEST_ONLY shift");
  assert.equal(result.context.isMgr, true);
  assert.equal(Object.hasOwn(result.context, "me"), false);
  assert.equal(JSON.stringify(result).includes("auth_users"), false);
});

test("seized selected-day leadership drives only the existing records view; cursor and facet counts share it", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const day = B.today.d === 30 ? 29 : B.today.d + 1,
    keys = {
      [B.today.y + "-" + B.today.m + "-" + B.today.d]: {
        shifts: {
          A: {
            pulled: true,
            roster: [{ ekey: "TEST_ONLY_E1" }],
            leaders: { chief: "TEST_ONLY employee" },
          },
        },
      },
      [B.today.y + "-" + B.today.m + "-" + day]: {
        shifts: {
          A: {
            pulled: true,
            roster: [{ ekey: "TEST_ONLY_E1" }],
            leaders: { chief: "TEST_ONLY other" },
          },
        },
      },
    };
  await put(B, "bsdept:" + DEPT + ":bassam_dreport_v1", keys);
  await B.DB.batch(
    B.W.szInstallStatements(
      B.env,
      B.W.szConvert(DEPT, {
        reports: {
          reports: [
            {
              id: "TEST_ONLY_own",
              ...reportData(B),
              actorKey: "TEST_ONLY_E1",
              ts: 1,
            },
            {
              id: "TEST_ONLY_foreign",
              ...reportData(B),
              actorKey: "TEST_ONLY_other",
              loc: "TEST_ONLY outsider location",
              ts: 2,
            },
          ],
        },
      }),
    ),
  );
  const leader = await B.read({ day: B.today.d, limit: 1 }, "staff"),
    ordinary = await B.read({ day, limit: 1 }, "staff");
  assert.equal(leader.total, 2);
  assert.equal(ordinary.total, 1);
  assert.equal(ordinary.monthTotals.reports, 1);
  assert.deepEqual(ordinary.facets.locations, ["TEST_ONLY location"]);
  await assert.rejects(
    B.read({ day, limit: 1, cursor: leader.next }, "staff"),
    (e) => e.szCode === "seized-cursor-stale",
  );
});
test("seized cursor binds resource revisions and retired KV reintroduction fails closed on every read", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  for (let i = 0; i < 2; i++)
    await B.act(await B.body("create", { data: reportData(B) }));
  const first = await B.read({ limit: 1 });
  await B.act(await B.body("create", { data: reportData(B) }));
  await assert.rejects(
    B.read({ limit: 1, cursor: first.next }),
    (e) => e.szCode === "seized-cursor-stale",
  );
  B.DB.db
    .prepare("INSERT INTO kv(k,seq,v)VALUES(?,0,?)")
    .run("bsdept:" + DEPT + ":bassam_seized_locs_v1:TEST_ONLY_bad", "[]");
  for (const view of [
    "records",
    "calendar",
    "dashboard",
    "catalogs",
    "context",
  ])
    await assert.rejects(
      B.read({ view }),
      (e) => e.szCode === "seized-legacy-source-present" && e.szStatus === 503,
    );
});

test("seized dashboard retains configured timestamp-derived overnight shift and latest historical actor snapshot", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  await put(B, "bsdept:" + DEPT + ":bassam_shift_options_v1", [
    { name: "TEST_ONLY day", tStart: "04:00", tEnd: "20:00" },
    { name: "TEST_ONLY night", tStart: "20:00", tEnd: "04:00" },
  ]);
  await B.DB.batch(
    B.W.szInstallStatements(
      B.env,
      B.W.szConvert(DEPT, {
        reports: {
          reports: [
            {
              id: "TEST_ONLY_derived",
              ...reportData(B),
              ts: Date.UTC(2026, 9, 30, 23),
              actor: "TEST_ONLY first snapshot",
              actorKey: "TEST_ONLY historical",
            },
            {
              id: "TEST_ONLY_explicit",
              ...reportData(B),
              ts: 0,
              shift: "TEST_ONLY night",
              actor: "TEST_ONLY latest snapshot",
              actorKey: "TEST_ONLY historical",
            },
          ],
        },
      }),
    ),
  );
  const d = (
      await B.read({
        view: "dashboard",
        mode: "month",
        year: B.today.y,
        month: B.today.m,
      })
    ).dashboard,
    night = d.shifts.find((s) => s.name === "TEST_ONLY night");
  assert.equal(night.reports, 2);
  assert.equal(night.qty, 2);
  assert.equal(night.employees, 1);
  assert.equal(d.summary.totals.employees, 1);
  assert.equal(d.employees[0].name, "TEST_ONLY latest snapshot");
  assert.equal(d.employees[0].shift, "TEST_ONLY night");
});
