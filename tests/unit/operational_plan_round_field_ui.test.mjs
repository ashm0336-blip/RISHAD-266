import { clone, operations, floor } from "./operational_ui_fx.mjs";
/* Real UI methods over a deterministic typed Operations contract. Confirmed
   memory advances only on ACK; no browser storage, generated page or network. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import * as acorn from "acorn";

const planSource = fs.readFileSync("src/modules/plan/logic.js", "utf8");
const ast = acorn.parse(planSource, { ecmaVersion: "latest" });

function world(extra = {}) {
  const current = floor(),
    initial = {
      bassam_plan_v1: {
        pMig: 3,
        floors: [current],
        months: { "1448-1": { c: 1, d: [clone(current)] } },
        cfg: {},
        delMonths: {},
      },
      bassam_rounds_v1: { "1448-1-2": { t: 1, ap: 0, d: [clone(current)] } },
      bassam_gate_opts_v1: {
        loc: ["TEST_ONLY loc"],
        gtype: [],
        kind: [],
        route: [],
        cls: [],
        cat: [],
      },
      bassam_zone_opts_v1: {
        region: [],
        level: [],
        ztype: [],
        zcat: [],
        zcatStyle: {},
        hMig: 3,
      },
      bassam_employees_v1: [
        { eid: "TEST_ONLY_EMP", name: "TEST_ONLY employee" },
      ],
      ...extra,
    };
  const op = operations(initial),
    seen = { storage: 0, gc: 0, kept: [], unkept: [], images: [], toasts: [] };
  const KIVO = {
    __BS_SRV: { operations: op.service },
    BassamPageKit: {
      base: () =>
        class {
          curHijri() {
            return { y: 1448, m: 1, d: 2 };
          }
        },
    },
    BassamPerm: { can: () => true, lensOn: () => true },
    BassamAuth: {
      user: () => ({
        id: "TEST_ONLY_UID",
        role: "staff",
        ekey: "TEST_ONLY_EMP",
      }),
      display: () => ({ name: "TEST_ONLY actor" }),
    },
    BassamPurge: {
      keep: (id) => seen.kept.push(id),
      unkeep: (id) => seen.unkept.push(id),
    },
    BassamIDB: {
      set: async (id, value) => {
        seen.images.push({ id, value });
        return true;
      },
      get: async () => null,
    },
  };
  const C = vm.createContext({
    KIVO,
    DCLogic: class {},
    Date,
    Intl,
    TextEncoder,
    Promise,
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem() {
        seen.storage++;
        throw Error("legacy-storage-forbidden");
      },
      setItem() {
        seen.storage++;
        throw Error("legacy-storage-forbidden");
      },
      removeItem() {
        seen.storage++;
        throw Error("legacy-storage-forbidden");
      },
    },
  });
  vm.runInContext(planSource + "\nglobalThis.TestComponent=Component;", C);
  const component = new C.TestComponent();
  component.bsToast = (...args) => seen.toasts.push(args);
  component._histPush = () => {};
  component._gcImages = () => {
    seen.gc++;
    return true;
  };
  component.curHijri = () => ({ y: 1448, m: 1, d: 2 });
  component.setState = (update, callback) => {
    component.state = {
      ...component.state,
      ...(typeof update === "function" ? update(component.state) : update),
    };
    if (callback) callback();
  };
  const source = component.loadPlan();
  component.loadGateOpts();
  component.loadZoneOpts();
  component._opRead("bassam_rounds_v1");
  component.state = {
    ...clone(source),
    year: 1448,
    month: 1,
    floor: 0,
    planMonths: clone(source.months),
    zones: clone(current.zones),
    gates: clone(current.gates),
    marks: [],
    paths: [],
    gateOpts: clone(initial.bassam_gate_opts_v1),
    zoneOpts: clone(initial.bassam_zone_opts_v1),
  };
  return { C, KIVO, component, op, seen };
}
function service(w, name) {
  vm.runInContext(fs.readFileSync("src/services/" + name, "utf8"), w.C);
}
function action(w, name) {
  let property;
  function visit(node) {
    if (!node || typeof node !== "object" || !node.type) return;
    if (node.type === "Property" && node.key.name === name) property = node;
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value?.type) visit(value);
    }
  }
  visit(ast);
  assert.ok(property);
  return vm
    .runInContext(
      "(function(){return (" +
        planSource.slice(property.value.start, property.value.end) +
        ")})",
      w.C,
    )
    .call(w.component);
}
const siteSave = (w) => action(w, "siteModalSave");
test("Plan loads confirmed typed data without business Storage or browser-triggered migrations", () => {
  const w = world();
  assert.equal(w.component.loadPlan().floors[0].sid, "TEST_ONLY_SITE");
  assert.equal(w.op.control.stages.length, 0);
  assert.equal(w.seen.storage, 0);
  assert.ok(
    !/_migrateLevelBinds|_fixZoneLabels|_fixPathDefaults|_fixPlanAnchors/.test(
      planSource,
    ),
  );
  assert.ok(!/localStorage\.(setItem|removeItem)\(/.test(planSource));
  for (const file of ["420-round-factory.js", "520-field-monitor.js"])
    assert.ok(
      !/localStorage\./.test(fs.readFileSync("src/services/" + file, "utf8")),
    );
});
test("Plan rejects a revision or identity change after editor load before staging any write", async () => {
  for (const change of [
    (w) => w.op.revs.bassam_plan_v1++,
    (w) => (w.op.control.context.uid = "OTHER_TEST_ONLY_UID"),
  ]) {
    const w = world();
    change(w);
    w.component.state.gates[0].closed = true;
    const result = await w.component.savePlan();
    assert.equal(result.ok, 0);
    assert.equal(w.op.control.stages.length, 0);
    assert.equal(w.op.data.bassam_plan_v1.floors[0].gates[0].closed, undefined);
  }
});
test("Plan keeps confirmed data and images until ACK and advances the next draft only after it", async () => {
  const w = world();
  let release;
  w.op.control.gate = new Promise((resolve) => {
    release = resolve;
  });
  w.component.state.gates[0].closed = true;
  let done = false;
  const saving = w.component.savePlan().then((result) => {
    done = true;
    return result;
  });
  await Promise.resolve();
  assert.equal(done, false);
  assert.equal(w.op.data.bassam_plan_v1.floors[0].gates[0].closed, undefined);
  const gc = w.component._opGc();
  assert.equal(w.seen.gc, 0);
  release();
  assert.equal((await saving).ok, 1);
  await gc;
  assert.equal(w.seen.gc, 1);
  assert.equal(w.op.data.bassam_plan_v1.floors[0].gates[0].closed, true);
  w.op.control.gate = null;
  w.component.state.gates[0].closed = false;
  assert.equal((await w.component.savePlan()).ok, 1);
  assert.equal(w.op.control.stages.length, 2);
});
test("lost Plan ACK retries the exact ticket/body and a changed intent never replaces it", async () => {
  const w = world();
  w.op.control.mode = "uncertain";
  w.component.state.gates[0].closed = true;
  const first = await w.component.savePlan(),
    body = w.op.control.stages[0].body;
  assert.equal(first.uncertain, true);
  assert.equal(w.seen.gc, 0);
  const second = await w.component.savePlan();
  assert.equal(second.ticket, first.ticket);
  assert.equal(w.op.control.stages.length, 1);
  assert.equal(w.op.control.stages[0].body, body);
  w.component.state.gates[0].closed = false;
  const changed = await w.component.savePlan();
  assert.equal(changed.err, "review-required");
  assert.equal(w.op.control.sends.length, 2);
  assert.equal(w.op.control.edits, 1);
});
test("gate option deletion changes catalog, unapproved rounds and Plan in exactly one atomic ticket", async () => {
  const w = world();
  w.op.data.bassam_rounds_v1["1448-1-3"] = { ap: 1, d: [floor()] };
  w.component.delGateOpt("loc", 0);
  assert.equal((await w.component._opLastSave).ok, 1);
  assert.equal(w.op.control.stages.length, 1);
  const body = JSON.parse(w.op.control.stages[0].body);
  assert.deepEqual(Object.keys(body).sort(), [
    "bassam_gate_opts_v1",
    "bassam_plan_v1",
    "bassam_rounds_v1",
  ]);
  assert.equal(body.bassam_plan_v1.floors[0].gates[0].loc, "");
  assert.equal(body.bassam_rounds_v1["1448-1-2"].d[0].gates[0].loc, "");
  assert.equal(
    body.bassam_rounds_v1["1448-1-3"].d[0].gates[0].loc,
    "TEST_ONLY loc",
  );
  assert.equal(body.bassam_plan_v1.floors[0].sid, "TEST_ONLY_SITE");
});
test("gate option rename updates the existing identities with the catalog in one ticket", async () => {
  const w = world();
  w.component.state.gDdEdit = { key: "loc", idx: 0 };
  w.component.state.gDdEditVal = "TEST_ONLY renamed";
  w.component.saveGateOptEdit();
  assert.equal((await w.component._opLastSave).ok, 1);
  assert.equal(w.op.control.stages.length, 1);
  const body = JSON.parse(w.op.control.stages[0].body);
  assert.deepEqual(Object.keys(body).sort(), [
    "bassam_gate_opts_v1",
    "bassam_plan_v1",
  ]);
  assert.equal(body.bassam_plan_v1.floors[0].gates[0].uid, "TEST_ONLY_GATE");
  assert.equal(body.bassam_plan_v1.floors[0].gates[0].loc, "TEST_ONLY renamed");
});
test("site image upload must explicitly ACK before any iid change or business command", async () => {
  const w = world(),
    save = siteSave(w);
  w.component.state.siteModal = {
    mode: "edit",
    i: 0,
    name: "TEST_ONLY site",
    img: "data:image/png;base64,TEST_ONLY",
  };
  let release;
  w.KIVO.BassamIDB.set = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const pending = save();
  assert.equal(w.component.state.floors[0].iid, "img_test_original");
  assert.equal(w.op.control.stages.length, 0);
  release(false);
  await pending;
  assert.equal(w.op.control.stages.length, 0);
  assert.equal(w.component.state.floors[0].iid, "img_test_original");
  assert.ok(w.component.state.siteModal);
  assert.equal(w.seen.gc, 0);
});
test("acknowledged image retains its old reference when the subsequent Plan ACK is uncertain", async () => {
  const w = world(),
    save = siteSave(w);
  w.op.control.mode = "uncertain";
  w.component.state.siteModal = {
    mode: "edit",
    i: 0,
    name: "TEST_ONLY site",
    img: "data:image/png;base64,TEST_ONLY",
  };
  await save();
  await w.component._opLastSave;
  assert.notEqual(w.component.state.floors[0].iid, "img_test_original");
  assert.equal(w.op.data.bassam_plan_v1.floors[0].iid, "img_test_original");
  assert.deepEqual(w.seen.kept, ["img_test_original"]);
  assert.equal(w.seen.unkept.length, 0);
  assert.equal(w.seen.gc, 0);
});
test("round factory waits for ACK and preserves the copied site and shift snapshot identities", async () => {
  const w = world();
  service(w, "420-round-factory.js");
  let release;
  w.op.control.gate = new Promise((resolve) => {
    release = resolve;
  });
  const promise = w.KIVO.BassamRound.ensure(1448, 1, 4);
  assert.equal(w.op.data.bassam_rounds_v1["1448-1-4"], undefined);
  release();
  const result = await promise;
  assert.equal(result.status, "created");
  assert.equal(
    w.op.data.bassam_rounds_v1["1448-1-4"].d[0].sid,
    "TEST_ONLY_SITE",
  );
  w.op.control.gate = null;
  const approval = await w.KIVO.BassamRound.setShiftAp(
    1448,
    1,
    4,
    "TEST_ONLY shift",
    true,
  );
  assert.equal(approval.status, "approved");
  assert.equal(
    w.op.data.bassam_rounds_v1["1448-1-4"].shAp["TEST_ONLY shift"].snap[0].sid,
    "TEST_ONLY_SITE",
  );
  assert.equal(w.seen.storage, 0);
});
test("round factory retries one uncertain request and blocks a different request from replacing it", async () => {
  const w = world();
  service(w, "420-round-factory.js");
  w.op.control.mode = "uncertain";
  const first = await w.KIVO.BassamRound.ensure(1448, 1, 4);
  assert.equal(first.status, "uncertain");
  const changed = await w.KIVO.BassamRound.ensure(1448, 1, 5);
  assert.equal(changed.status, "conflict");
  assert.equal(w.op.control.stages.length, 1);
  w.op.control.mode = "ok";
  const repeated = await w.KIVO.BassamRound.ensure(1448, 1, 4);
  assert.equal(repeated.status, "created");
  assert.equal(w.op.control.stages.length, 1);
  assert.equal(w.op.control.sends[0], w.op.control.sends[1]);
});
test("field service performs no startup write and rejects a stale displayed target before staging", async () => {
  const w = world();
  service(w, "520-field-monitor.js");
  assert.equal(w.op.control.stages.length, 0);
  assert.equal(w.KIVO.BassamField.purgeLegacy, undefined);
  const result = await w.KIVO.BassamField.observe("1448-1-2", 0, 0, {
    st: "closed",
    why: "TEST_ONLY",
    kind: "gates",
    expected: { uid: "OTHER_TEST_ONLY_GATE" },
  });
  assert.equal(result.ok, false);
  assert.equal(result.err, "review-required");
  assert.equal(w.op.control.stages.length, 0);
  assert.equal(w.seen.storage, 0);
});
test("field observation writes one history entry only after ACK and retries identical bytes after loss", async () => {
  const w = world();
  service(w, "520-field-monitor.js");
  const expected = clone(w.op.data.bassam_rounds_v1["1448-1-2"].d[0].gates[0]),
    intent = { st: "closed", why: "TEST_ONLY reason", kind: "gates", expected };
  w.op.control.mode = "uncertain";
  const first = await w.KIVO.BassamField.observe("1448-1-2", 0, 0, intent);
  assert.equal(first.status, "uncertain");
  assert.equal(
    w.op.data.bassam_rounds_v1["1448-1-2"].d[0].gates[0].closed,
    undefined,
  );
  w.op.control.mode = "ok";
  const ack = await w.KIVO.BassamField.observe("1448-1-2", 0, 0, intent);
  assert.equal(ack.ok, true);
  const gate = w.op.data.bassam_rounds_v1["1448-1-2"].d[0].gates[0];
  assert.equal(gate.closed, true);
  assert.equal(gate.fLog.length, 1);
  assert.equal(gate.uid, "TEST_ONLY_GATE");
  assert.equal(w.op.control.stages.length, 1);
  assert.equal(w.op.control.sends[0], w.op.control.sends[1]);
});
test("deleting the selected month preserves the existing site identity and commits matching rounds once", async () => {
  const w = world();
  w.KIVO.BassamAudit = {
    newId: () => "NEW_TEST_ONLY_WRONG_ID",
    stampSite: () => {},
  };
  w.component.state.planDelMonth = { y: 1448, m: 1 };
  action(w, "planDelDo")();
  assert.equal((await w.component._opLastSave).ok, 1);
  assert.equal(w.op.control.stages.length, 1);
  const body = JSON.parse(w.op.control.stages[0].body);
  assert.equal(body.bassam_plan_v1.floors[0].sid, "TEST_ONLY_SITE");
  assert.equal(body.bassam_rounds_v1["1448-1-2"], undefined);
  assert.ok(body.bassam_plan_v1.delMonths["1448-1"]);
});
test("draft round planners combine a new report and round approval without dispatching a separate request", async () => {
  const w = world({ bassam_dreport_v1: {} });
  service(w, "420-round-factory.js");
  const owner = {},
    begun = w.op.service.begin(owner, "TEST_ONLY_report");
  assert.equal(begun.ok, 1);
  const result = await w.op.service.commit(
    owner,
    "TEST_ONLY_report",
    { day: 4 },
    (draft) => {
      const ensured = w.KIVO.BassamRound.prepareEnsure(draft, 1448, 1, 4);
      assert.equal(ensured.status, "created");
      assert.equal(w.op.control.sends.length, 0);
      const approved = w.KIVO.BassamRound.prepareShiftAp(
        draft,
        1448,
        1,
        4,
        "TEST_ONLY shift",
        true,
      );
      assert.equal(approved.status, "approved");
      draft.set("bassam_dreport_v1", { "1448-1-4": { ap: 1 } });
    },
  );
  assert.equal(result.ok, 1);
  assert.equal(w.op.control.stages.length, 1);
  const body = JSON.parse(w.op.control.stages[0].body);
  assert.deepEqual(Object.keys(body).sort(), [
    "bassam_dreport_v1",
    "bassam_rounds_v1",
  ]);
  assert.equal(
    body.bassam_rounds_v1["1448-1-4"].shAp["TEST_ONLY shift"].snap[0].sid,
    "TEST_ONLY_SITE",
  );
});
test("field denial leaves the confirmed element and history unchanged", async () => {
  const w = world();
  service(w, "520-field-monitor.js");
  const expected = clone(w.op.data.bassam_rounds_v1["1448-1-2"].d[0].gates[0]);
  w.op.control.mode = "denied";
  const before = JSON.stringify(w.op.data.bassam_rounds_v1),
    result = await w.KIVO.BassamField.observe("1448-1-2", 0, 0, {
      st: "closed",
      why: "TEST_ONLY",
      kind: "gates",
      expected,
    });
  assert.equal(result.ok, false);
  assert.equal(result.status, "denied");
  assert.equal(JSON.stringify(w.op.data.bassam_rounds_v1), before);
});
test("identical concurrent round/field callers share the in-flight result and retain a lost ACK ticket", async () => {
  for (const kind of ["round", "field"]) {
    const w = world();
    service(
      w,
      kind === "round" ? "420-round-factory.js" : "520-field-monitor.js",
    );
    const expected = clone(
      w.op.data.bassam_rounds_v1["1448-1-2"].d[0].gates[0],
    );
    const call = () =>
      kind === "round"
        ? w.KIVO.BassamRound.ensure(1448, 1, 4)
        : w.KIVO.BassamField.observe("1448-1-2", 0, 0, {
            st: "closed",
            why: "TEST_ONLY",
            kind: "gates",
            expected,
          });
    let release;
    w.op.control.mode = "uncertain";
    w.op.control.gate = new Promise((resolve) => {
      release = resolve;
    });
    const first = call(),
      second = call();
    release();
    const results = await Promise.all([first, second]);
    assert.equal(results[0].status, "uncertain", kind);
    assert.equal(results[1].status, "uncertain", kind);
    assert.equal(w.op.control.sends.length, 1, kind);
    assert.equal(w.op.control.stages.length, 1, kind);
    w.op.control.gate = null;
    w.op.control.mode = "ok";
    const repeated = await call();
    assert.equal(
      kind === "round" ? repeated.status : repeated.ok,
      kind === "round" ? "created" : true,
    );
    assert.equal(w.op.control.stages.length, 1, kind);
  }
});
