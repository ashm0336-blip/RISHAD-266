import { test } from "node:test";
import assert from "node:assert/strict";
import {
  commandWorld,
  reportData,
  clone,
  snapshot,
  put,
  DEPT,
  OTHER,
} from "./seized_fx.mjs";
const editData = (r, patch = {}) => ({
  loc: r.loc,
  no: r.no,
  note: r.note,
  items: r.items.map((i, sourceIndex) => {
    const x = clone(i);
    delete x.hist;
    return { ...x, sourceIndex };
  }),
  ...patch,
});
function all(B) {
  return {
    ...snapshot(B),
    ...Object.fromEntries(
      ["revs", "aud", "authz", "imgref", "imgown"]
        .concat(
          B.DB.q(
            "SELECT name FROM sqlite_master WHERE type='table' AND name GLOB 'notification_*'",
          ).map((r) => r.name),
        )
        .map((t) => [t, clone(B.DB.q("SELECT * FROM " + t))]),
    ),
  };
}
test("seized actual staged commands create/read/edit/item-action/delete atomically preserve server identity and history", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const a = await B.act(await B.body("create", { data: reportData(B) }));
  assert.match(a.id, /^sz-/);
  assert.deepEqual(a.affected, ["reports"]);
  let r = (await B.read()).rows[0];
  assert.equal(r.actor, "TEST_ONLY owner");
  assert.equal(r.actorKey, "TEST_ONLY_super");
  assert.equal(r.items[0].n, 100);
  const old = clone(r);
  await B.act(
    await B.body("edit", {
      id: r.id,
      data: editData(r, { note: "TEST_ONLY edited" }),
    }),
  );
  r = (await B.read()).rows[0];
  assert.equal(r.ts, old.ts);
  assert.equal(r.actor, old.actor);
  assert.equal(r.editedBy, "TEST_ONLY owner");
  await B.act(await B.body("item-action", { id: r.id, index: 0, act: "sec" }));
  r = (await B.read()).rows[0];
  assert.equal(r.items[0].act, "sec");
  assert.equal(r.items[0].hist.length, 1);
  assert.equal(r.items[0].hist[0].by, "TEST_ONLY owner");
  assert.equal(r.items[0].hist[0].from, "sto");
  await B.act(await B.body("delete", { id: r.id }));
  assert.equal((await B.read()).rows.length, 0);
  assert.equal(
    B.DB.q("SELECT COUNT(*)n FROM kv WHERE k GLOB '*bassam_seized*'")[0].n,
    0,
  );
  assert.equal(B.DB.q("SELECT COUNT(*)n FROM aud")[0].n, 4);
  assert.deepEqual(B.DB.q("PRAGMA foreign_key_check"), []);
});
test("seized exact replay returns one receipt/audit; reused changed request, stale CAS and forged UID write nothing", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const body = await B.body("create", { data: reportData(B) }),
    a = await B.act(body),
    before = all(B);
  assert.deepEqual(await B.act(body), a);
  assert.deepEqual(all(B), before);
  await assert.rejects(
    B.act({ ...body, data: reportData(B, { note: "TEST_ONLY changed" }) }),
    (e) => e.szStatus === 409,
  );
  await assert.rejects(
    B.act({ ...body, requestId: "TEST_ONLY stale" }),
    (e) => e.szStatus === 409,
  );
  await assert.rejects(
    B.act({
      ...(await B.body("create", { data: reportData(B) })),
      uid: "TEST_ONLY_staff",
    }),
    (e) => e.szCode === "session-changed",
  );
  assert.deepEqual(all(B), before);
});
test("seized late audit SQL error rolls back data/revisions/NF/images/receipts; lost acknowledgement replays once", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const before = all(B),
    body = await B.body("create", { data: reportData(B) });
  B.DB.failIf = (sql) => sql.startsWith("INSERT INTO aud(");
  await assert.rejects(B.act(body), /injected failure/);
  B.DB.failIf = null;
  assert.deepEqual(all(B), before);
  const batch = B.DB.batch.bind(B.DB);
  let lost = false;
  B.DB.batch = async (statements) => {
    const result = await batch(statements);
    if (
      !lost &&
      statements.some((s) => s.sql.startsWith("INSERT INTO seized_requests"))
    ) {
      lost = true;
      throw Error("TEST_ONLY lost ACK");
    }
    return result;
  };
  const a = await B.act(body);
  assert.equal(lost, true);
  assert.deepEqual(await B.act(body), a);
  assert.equal(B.DB.q("SELECT COUNT(*)n FROM seized_reports")[0].n, 1);
  assert.equal(B.DB.q("SELECT COUNT(*)n FROM seized_requests")[0].n, 1);
});
test("seized command fences raw permission and retired legacy-key races inside the final batch", async (t) => {
  for (const mode of ["permission", "legacy"]) {
    const B = await commandWorld();
    t.after(() => B.DB.db.close());
    const body = await B.body("create", { data: reportData(B) }),
      batch = B.DB.batch.bind(B.DB);
    let raced = false;
    B.DB.batch = async (statements) => {
      if (
        !raced &&
        statements.some((s) => s.sql.startsWith("INSERT INTO seized_requests"))
      ) {
        raced = true;
        if (mode === "permission") {
          const p = clone(B.keys.bassam_perms_v1);
          p.caps[DEPT] = [];
          B.DB.db
            .prepare("UPDATE kv SET v=? WHERE k=?")
            .run(JSON.stringify(p), "bassam_perms_v1");
        } else
          B.DB.db
            .prepare("INSERT INTO kv(k,seq,v)VALUES(?,0,?)")
            .run(
              "bsdept:" + DEPT + ":bassam_seized_v1:TEST_ONLY_forbidden",
              "{}",
            );
      }
      return batch(statements);
    };
    await assert.rejects(B.act(body));
    assert.equal(raced, true);
    assert.equal(B.DB.q("SELECT COUNT(*)n FROM seized_reports")[0].n, 0);
    assert.equal(B.DB.q("SELECT COUNT(*)n FROM seized_requests")[0].n, 0);
  }
});
test("seized denied staff/scope and old-date writes retain every business row", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  for (const body of [
    await B.body("create", { data: reportData(B) }, "denied"),
    await B.body("create", { dept: OTHER, data: reportData(B) }, "staff"),
  ])
    await assert.rejects(
      B.act(body, body.uid.slice("TEST_ONLY_".length)),
      (e) => e.szStatus === 403,
    );
  const before = all(B),
    date =
      B.today.m > 1
        ? { y: B.today.y, m: B.today.m - 1, d: 1 }
        : { y: B.today.y - 1, m: 12, d: 1 };
  await assert.rejects(
    B.act(await B.body("create", { data: reportData(B, date) })),
    (e) =>
      e.szStatus === 403 &&
      e.szDecision.dims.includes("DateRange") &&
      /closed-period: no-window/.test(e.szDecision.detail),
  );
  assert.deepEqual(all(B), before);
});
test("seized catalog deletion refuses used items/actions/locations/kinds and rename updates exact items plus both revisions", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  await B.act(
    await B.body("create", {
      data: reportData(B, {
        items: [
          {
            id: 24,
            n: 2,
            val: 300,
            act: "sto",
            kind: "TEST_ONLY kind",
            kindTxt: "",
            photos: [],
          },
        ],
      }),
    }),
  );
  for (const [kind, value] of [
    ["catalog", { ver: 1, cats: [] }],
    ["actions", [{ k: "sec", name: "TEST_ONLY security" }]],
    ["locations", []],
    ["jew", []],
  ])
    await assert.rejects(
      B.act(await B.body("catalog-replace", { kind, value })),
      (e) => e.szCode === "seized-catalog-in-use",
    );
  const a = await B.act(
    await B.body("jew-rename", {
      from: "TEST_ONLY kind",
      to: "TEST_ONLY renamed",
    }),
  );
  assert.deepEqual(a.affected, ["reports", "jew"]);
  assert.equal(a.base.reports, a.rev);
  assert.equal(a.base.jew, a.rev);
  assert.equal(a.n, 1);
  assert.equal((await B.read()).rows[0].items[0].kind, "TEST_ONLY renamed");
});
test("seized photos keep shared references and metadata inside the same transaction, without deleting image bodies", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const image = "szp_test_shared";
  B.DB.db
    .prepare("INSERT INTO imgs(k,seq,v)VALUES(?,0,'TEST_ONLY image body')")
    .run(image);
  B.DB.db
    .prepare(
      "INSERT INTO imgown(img,st,k,uid,dept,ts)VALUES(?,'claim','','TEST_ONLY_super','',1)",
    )
    .run(image);
  const items = [
      {
        id: 23,
        n: 1,
        val: 0,
        act: "sto",
        kind: "",
        kindTxt: "",
        photos: [image],
      },
    ],
    a = await B.act(await B.body("create", { data: reportData(B, { items }) })),
    b = await B.act(await B.body("create", { data: reportData(B, { items }) }));
  await B.act(await B.body("photo-delete", { id: a.id, index: 0, image }));
  assert.equal(
    B.DB.q("SELECT COUNT(*)n FROM imgref WHERE img=?", image)[0].n,
    1,
  );
  assert.equal(
    B.DB.q("SELECT st FROM imgown WHERE img=?", image)[0].st,
    "bound",
  );
  await B.act(await B.body("delete", { id: b.id }));
  assert.equal(
    B.DB.q("SELECT COUNT(*)n FROM imgref WHERE img=?", image)[0].n,
    0,
  );
  assert.equal(
    B.DB.q("SELECT st FROM imgown WHERE img=?", image)[0].st,
    "orphan",
  );
  assert.equal(B.DB.q("SELECT COUNT(*)n FROM imgs WHERE k=?", image)[0].n, 1);
});
test("seized create plans existing notification templates in the same commit, not a post-commit observer", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const original = B.DB.batch.bind(B.DB);
  let writes = [];
  B.DB.batch = async (s) => {
    if (s.some((q) => q.sql.startsWith("INSERT INTO seized_requests")))
      writes.push(s.map((q) => q.sql));
    return original(s);
  };
  await B.act(
    await B.body("create", {
      data: reportData(B, {
        items: [
          {
            id: 23,
            n: 51000,
            val: 0,
            act: "sec",
            kind: "",
            kindTxt: "",
            photos: [],
          },
        ],
      }),
    }),
  );
  assert.equal(writes.length, 1);
  assert.ok(writes[0].some((s) => s.includes("notification_messages")));
  assert.ok(writes[0].some((s) => s.startsWith("INSERT INTO aud(")));
  assert.ok(B.DB.q("SELECT COUNT(*)n FROM notification_messages")[0].n >= 1);
});

test("seized concurrent identical requests commit one report/receipt/audit and reject after epoch rollback", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const b = await B.body("create", { data: reportData(B) }),
    acks = await Promise.all([B.act(b), B.act(clone(b))]);
  assert.deepEqual(acks[0], acks[1]);
  for (const table of ["seized_reports", "seized_requests", "aud"])
    assert.equal(B.DB.q("SELECT COUNT(*)n FROM " + table)[0].n, 1);
  B.DB.exec(
    "INSERT INTO meta(k,v)VALUES('restore_epoch','1')ON CONFLICT(k)DO UPDATE SET v='1'",
  );
  await assert.rejects(B.act(b), (e) => e.szCode === "restore-epoch-changed");
});
test("seized typed retro permits every old affected date and transaction fences a late window revocation", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const old =
      B.today.m > 1
        ? { y: B.today.y, m: B.today.m - 1, d: 1 }
        : { y: B.today.y - 1, m: 12, d: 1 },
    state = {
      v: 1,
      windows: [
        {
          id: "TEST_ONLY_window",
          scope: { y: old.y, m: old.m, d: null },
          at: Date.now() - 10,
          until: Date.now() + 3600000,
          hours: 1,
          by: {
            id: "TEST_ONLY_super",
            un: "1000000001",
            ekey: "",
            name: "TEST_ONLY owner",
          },
          reason: "TEST_ONLY authorized window",
        },
      ],
    };
  await B.DB.batch(B.W.szRetroStatements(B.env, DEPT, state));
  await B.act(await B.body("create", { data: reportData(B, old) }));
  const row = (await B.read({ year: old.y, month: old.m })).rows[0],
    body = await B.body("edit", {
      id: row.id,
      data: editData(row, { note: "TEST_ONLY must rollback" }),
    }),
    batch = B.DB.batch.bind(B.DB);
  let raced = false;
  B.DB.batch = async (s) => {
    if (
      !raced &&
      s.some((x) => x.sql.startsWith("INSERT INTO seized_requests"))
    ) {
      raced = true;
      B.DB.db
        .prepare(
          "UPDATE seized_retro_windows SET until_at=0 WHERE department_id=?",
        )
        .run(DEPT);
    }
    return batch(s);
  };
  await assert.rejects(B.act(body));
  assert.equal(raced, true);
  assert.equal(B.DB.q("SELECT note FROM seized_reports")[0].note, "");
  assert.equal(B.DB.q("SELECT COUNT(*)n FROM seized_requests")[0].n, 1);
});
test("seized sourceIndex preserves separate server histories for duplicate catalog IDs after reordering", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const item = reportData(B).items[0],
    created = await B.act(
      await B.body("create", {
        data: reportData(B, { items: [clone(item), { ...item, n: 2 }] }),
      }),
    );
  await B.act(
    await B.body("item-action", { id: created.id, index: 1, act: "sec" }),
  );
  const row = (await B.read()).rows[0],
    data = editData(row);
  data.items.reverse();
  await B.act(await B.body("edit", { id: created.id, data }));
  let edited = (await B.read()).rows[0];
  assert.equal(edited.items[0].hist.length, 1);
  assert.equal(edited.items[1].hist.length, 0);
  const ambiguous = editData(edited);
  ambiguous.items.forEach((x) => delete x.sourceIndex);
  await assert.rejects(
    B.act(await B.body("edit", { id: created.id, data: ambiguous })),
    (e) => e.szCode === "seized-item-history-ambiguous",
  );
});
test("seized closed command DTO rejects supplied actor/history/unknown operations without writes", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const before = all(B);
  for (const mutate of [
    (b) => (b.data.actor = "TEST_ONLY forged"),
    (b) => (b.data.items[0].hist = [{ by: "TEST_ONLY forged" }]),
    (b) => (b.data.items[0].n = -1),
    (b) => (b.op = "TEST_ONLY_unknown"),
    (b) => (b.unknown = 1),
    (b) => (b.base.unknown = 1),
  ]) {
    const body = await B.body("create", { data: reportData(B) });
    mutate(body);
    await assert.rejects(B.act(body));
    assert.deepEqual(all(B), before);
  }
});
test("seized missing image ownership and ownership race reject without business or metadata partial writes", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const image = "szp_test_foreign",
    item = { ...reportData(B).items[0], photos: [image] };
  B.DB.db
    .prepare("INSERT INTO imgs(k,seq,v)VALUES(?,0,'TEST_ONLY body')")
    .run(image);
  const body = await B.body("create", {
    data: reportData(B, { items: [item] }),
  });
  await assert.rejects(B.act(body), (e) => e.szCode === "seized-image-denied");
  assert.equal(B.DB.q("SELECT COUNT(*)n FROM seized_reports")[0].n, 0);
  B.DB.db
    .prepare(
      "INSERT INTO imgown(img,st,k,uid,dept,ts)VALUES(?,'claim','','TEST_ONLY_super','',1)",
    )
    .run(image);
  const batch = B.DB.batch.bind(B.DB);
  let race = false;
  B.DB.batch = async (s) => {
    if (
      !race &&
      s.some((x) => x.sql.startsWith("INSERT INTO seized_requests"))
    ) {
      race = true;
      B.DB.db
        .prepare("UPDATE imgown SET st='bound',k=?,uid='' WHERE img=?")
        .run("bsdept:" + OTHER + ":bassam_seized_v1", image);
    }
    return batch(s);
  };
  await assert.rejects(B.act(body));
  assert.equal(race, true);
  assert.equal(B.DB.q("SELECT COUNT(*)n FROM seized_reports")[0].n, 0);
  assert.equal(B.DB.q("SELECT COUNT(*)n FROM imgref")[0].n, 0);
});

test("seized unused kind rename requires the existing reference edit permission without manufacturing report writes", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const permissions = clone(B.keys.bassam_perms_v1);
  permissions.emps[DEPT].TEST_ONLY_E1 = { "seized/records": ["view"] };
  await put(B, "bassam_perms_v1", permissions);
  await put(B, "bsdept:" + DEPT + ":bassam_grants_v1", {
    v: 1,
    emp: { TEST_ONLY_E1: { plus: ["ref.seized.kind.edit"], minus: [] } },
  });
  const ctx = await B.W.szQueryContext(B.env, await B.actor("staff"), DEPT, {
      write: true,
    }),
    decision = await B.W.szPermission(
      ctx,
      "jew",
      ["TEST_ONLY kind"],
      ["TEST_ONLY renamed"],
      "TEST_ONLY reference edit",
    );
  assert.equal(decision.decision.ok, true);
  const body = await B.body(
      "jew-rename",
      { from: "TEST_ONLY kind", to: "TEST_ONLY renamed" },
      "staff",
    ),
    ack = await B.act(body, "staff");
  assert.equal(ack.n, 0);
  assert.equal(
    B.DB.q(
      "SELECT COUNT(*)n FROM seized_resource_state WHERE resource='reports'",
    )[0].n,
    0,
  );
  assert.deepEqual(await B.act(body, "staff"), ack);
});

test("seized replay rechecks the exact original operation permission when another write permission remains", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const p = clone(B.keys.bassam_perms_v1);
  p.emps[DEPT].TEST_ONLY_E1 = { "seized/records": ["view"] };
  await put(B, "bassam_perms_v1", p);
  await put(B, "bsdept:" + DEPT + ":bassam_grants_v1", {
    v: 1,
    emp: {
      TEST_ONLY_E1: { plus: ["sz.rec.create", "sz.rec.edit"], minus: [] },
    },
  });
  const body = await B.body("create", { data: reportData(B) }, "staff");
  await B.act(body, "staff");
  await put(B, "bsdept:" + DEPT + ":bassam_grants_v1", {
    v: 1,
    emp: { TEST_ONLY_E1: { plus: ["sz.rec.edit"], minus: [] } },
  });
  const before = all(B);
  await assert.rejects(B.act(body, "staff"), (e) => e.szStatus === 403);
  assert.deepEqual(all(B), before);
});

test("seized receipt rejects malformed/missing/duplicate/unknown permission proofs before ACK or writes", async (t) => {
  const B = await commandWorld();
  t.after(() => B.DB.db.close());
  const b = await B.body("create", { data: reportData(B) });
  await B.act(b);
  const valid = B.DB.q(
    "SELECT permission_mode,permission_keys FROM seized_requests",
  )[0];
  assert.deepEqual(JSON.parse(valid.permission_keys), ["sz.rec.create"]);
  for (const proof of [
    "{}",
    "null",
    '["TEST_ONLY_unknown"]',
    '["sz.rec.create","sz.rec.create"]',
  ]) {
    B.DB.db.prepare("UPDATE seized_requests SET permission_keys=?").run(proof);
    const before = all(B);
    await assert.rejects(
      B.act(b),
      (e) => e.szCode === "seized-receipt-invalid",
    );
    assert.deepEqual(all(B), before);
  }
  B.DB.db
    .prepare(
      "UPDATE seized_requests SET permission_keys=?,permission_mode='TEST_ONLY_invalid'",
    )
    .run(valid.permission_keys);
  await assert.rejects(B.act(b), (e) => e.szCode === "seized-receipt-invalid");
});

test("seized legacy receipt records actual canonical classified acts instead of the generic command label", async (t) => {
  const B = await commandWorld({ mode: "legacy" });
  t.after(() => B.DB.db.close());
  const b = await B.body(
    "catalog-replace",
    {
      kind: "locations",
      value: ["TEST_ONLY location", "TEST_ONLY new location"],
    },
    "staff",
  );
  await B.act(b, "staff");
  assert.deepEqual(
    JSON.parse(
      B.DB.q("SELECT permission_keys FROM seized_requests")[0].permission_keys,
    ),
    ["locations:add"],
  );
  const p = clone(B.keys.bassam_perms_v1);
  p.emps[DEPT].TEST_ONLY_E1 = { "seized/records": ["view", "edit"] };
  await put(B, "bassam_perms_v1", p);
  await assert.rejects(B.act(b, "staff"), (e) => e.szStatus === 403);
});
