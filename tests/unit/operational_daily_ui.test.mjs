/* Actual Daily methods/actions over synthetic confirmed Operations memory.
   Every staged payload also passes the real closed relational codec. No DOM,
   generated Worker, cloud, credentials, R2 or historical-suite execution. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import * as acorn from "acorn";
import { clone, operations, floor } from "./operational_ui_fx.mjs";
import { SCHED_PARTS } from './sched_parts.mjs';   /* V7 · د5-د: أجزاءُ الجدولة من سجلّها */
import { calendar, callers } from './cal_kit.mjs';   /* V7 · د5-د2: التقويم الموحّد */
const source = fs.readFileSync("src/systems/daily/client/logic.js", "utf8"),
  ast = acorn.parse(source, { ecmaVersion: "latest" }),
  codec = vm.createContext({});
for (const file of [
  "019o-operational-codec.js",
  ...SCHED_PARTS,
  "019q-operations-people-tasks.js",
])
  vm.runInContext(fs.readFileSync("workers/parts/" + file, "utf8"), codec);
const prepared = codec.ocPrepare(
  codec.OC_SCHEDULING_RESOURCES.concat(codec.OC_PEOPLE_TASK_RESOURCES),
);
function world(extra = {}) {
  const first = floor(),
    initial = {
      bassam_plan_v1: {
        pMig: 3,
        floors: [first],
        months: { "2026-06": { c: 1, d: [clone(first)] } },
        cfg: {},
        delMonths: {},
      },
      bassam_rounds_v1: { "2026-06-02": { t: 1, ap: 0, d: [clone(first)] } },
      bassam_zone_opts_v1: {
        region: [],
        level: [],
        ztype: [],
        zcat: [],
        zcatStyle: {},
        hMig: 3,
      },
      bassam_gate_opts_v1: {
        loc: [],
        gtype: [],
        kind: [],
        route: [],
        cls: [],
        cat: [],
      },
      bassam_mark_kinds_v1: [],
      bassam_dreport_v1: {},
      bassam_employees_v1: [],
      ...extra,
    },
    op = operations(initial),
    seen = {
      storage: 0,
      images: [],
      toasts: [],
      ack: [],
      ids: 0,
    };
  op.control.validate = (changes) => {
    for (const [resource, value] of Object.entries(changes)) {
      const p = codec.ocForResource(prepared, resource),
        domain = codec.ocConvert(p, "TEST_ONLY_DEPT", resource, value, true);
      codec.ocInflate(p, domain);
    }
  };
  class Base {
    setState(update, callback) {
      this.state = {
        ...this.state,
        ...(typeof update === "function" ? update(this.state) : update),
      };
      if (callback) callback();
    }
    bsLensOn() {
      return true;
    }
    _uid() {
      return "TEST_ONLY_ELEMENT_" + ++seen.ids;
    }
    _optName(value) {
      return value && typeof value === "object"
        ? value.n || ""
        : String(value || "");
    }
    _optCode(value) {
      return value && typeof value === "object" ? value.k || value.c || "" : "";
    }
    _optCats(value) {
      return value && Array.isArray(value.c) ? value.c : null;
    }
    zoneOptList(name) {
      const value = (this.state.zoneOpts || {})[name];
      return Array.isArray(value)
        ? value.filter(
            (entry) =>
              (typeof entry === "string" && entry) ||
              (entry && typeof entry === "object" && entry.n),
          )
        : [];
    }
  }
  const KIVO = {
    __BS_SRV: { operations: op.service },
    BassamPageKit: { base: () => callers(Base, () => KIVO) },   /* V7 · د5-د2: مناديات التقويم كما تعطيها العُدّة */
    BassamPerm: { can: () => true, lensOn: () => true },
    BassamAuth: {
      user: () => ({
        id: "TEST_ONLY_UID",
        role: "staff",
        ekey: "TEST_ONLY_EMP",
      }),
      display: () => ({ name: "TEST_ONLY actor" }),
    },
    BassamAudit: {
      newId: () => "TEST_ONLY_NEW_SITE_" + ++seen.ids,
      stampRounds: () => {},
    },
    BassamIDB: {
      set: async (id, value) => {
        seen.images.push({ id, value });
        return true;
      },
      get: async () => null,
    },
    BassamCount: (n) => String(n),
  };
  class Image {
    set src(value) {
      this.width = this.naturalWidth = 200;
      this.height = this.naturalHeight = 100;
      if (this.onload) this.onload();
    }
  }
  const C = vm.createContext({
    KIVO,
    DCLogic: class {},
    Date,
    Intl,
    Image,
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
    },
  });
  calendar(C);
  /* V7 · د5-هـ: الناقل وروابطُ الخطة والجولات عليه — الجولاتُ تقرأ الخطةَ بالاسم وتكتب فيها بأوامر مالكها */
  for (const file of ["src/core/060-bus.js", "src/systems/plan/client/404-plan-p4.js", "src/systems/daily/client/421-round-links.js"])
    vm.runInContext(fs.readFileSync(file, "utf8"), C);
  vm.runInContext(source + "\nglobalThis.TestComponent=Component;", C);
  const component = new C.TestComponent();
  component.bsToast = (...args) => seen.toasts.push(args);
  component.bsAck = (...args) => seen.ack.push(args);
  component.hMonthDays = () => 30;
  component._opRead("bassam_plan_v1");
  component._opRead("bassam_gate_opts_v1");
  component.state = {
    ...component.state,
    year: 2026,
    month: 6,
    day: 2,
    floor: 0,
    rounds: clone(initial.bassam_rounds_v1),
  };
  return { C, KIVO, component, op, seen };
}
function actions() {
  const out = [];
  function walk(n) {
    if (!n || typeof n !== "object" || !n.type) return;
    if (n.type === "Property") out.push(n);
    for (const v of Object.values(n)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v?.type) walk(v);
    }
  }
  walk(ast);
  return out;
}
function action(w, name) {
  const n = actions().find((n) => n.key.name === name);
  assert.ok(n);
  return vm
    .runInContext(
      "(function(){return (" + source.slice(n.value.start, n.value.end) + ")})",
      w.C,
    )
    .call(w.component);
}
const site = (world) => action(world, "siteModalSave");
function importIntent(w) {
  w.component.state.imp = {
    pack: {
      kind: "hasr_round_v1",
      day: "2026-10-31",
      maps: [
        {
          name: "TEST_ONLY imported",
          imgData: "data:image/png;base64,TEST_ONLY",
          pins: [
            {
              shape: "zone",
              x: 20,
              y: 20,
              w: 10,
              h: 10,
              readiness: "TEST_ONLY ready",
              region: "TEST_ONLY region",
              role: "TEST_ONLY level",
              type: "TEST_ONLY type",
              category: "TEST_ONLY category",
            },
            { shape: "gate", x: 20, y: 30, dname: "TEST_ONLY gate", code: 7 },
            {
              shape: "path",
              points: [
                { x: 1, y: 1 },
                { x: 5, y: 6 },
              ],
              name: "TEST_ONLY path",
            },
          ],
        },
      ],
      lists: {},
    },
    boards: [{ on: true }],
    hy: 2026,
    hm: 6,
    hd: 4,
    rk: "2026-06-04",
    busy: false,
    mLock: false,
  };
}
test("Daily reads typed resources without browser Storage or automatic legacy writers", () => {
  const w = world();
  assert.equal(w.component.state.rounds["2026-06-02"].d[0].sid, "TEST_ONLY_SITE");
  assert.equal(w.op.control.stages.length, 0);
  assert.equal(w.seen.storage, 0);
  assert.ok(!/localStorage\.(setItem|removeItem)\(/.test(source));
  assert.ok(!/_fixRoundPathDefaults|_fixRoundAnchors|_planRW/.test(source));
});
test("Daily captured revision and identity reject stale whole-document writes before stage", async () => {
  for (const change of [
    (w) => w.op.revs.bassam_rounds_v1++,
    (w) => (w.op.control.context.uid = "OTHER_TEST_ONLY_UID"),
  ]) {
    const w = world();
    change(w);
    const draft = clone(w.component.state.rounds);
    draft["2026-06-02"].d[0].gates[0].closed = true;
    const ack = await w.component.saveRounds(draft);
    assert.equal(ack.ok, 0);
    assert.equal(w.op.control.stages.length, 0);
    assert.equal(
      w.op.data.bassam_rounds_v1["2026-06-02"].d[0].gates[0].closed,
      undefined,
    );
  }
});
test("Daily round drafts retain local editing while confirmed memory waits for ACK", async () => {
  const w = world();
  let release;
  w.op.control.gate = new Promise((resolve) => {
    release = resolve;
  });
  const next = clone(w.component.state.rounds);
  next["2026-06-02"].d[0].gates[0].closed = true;
  const saving = w.component.saveRounds(next);
  assert.equal(
    w.op.data.bassam_rounds_v1["2026-06-02"].d[0].gates[0].closed,
    undefined,
  );
  assert.equal(w.component.state.rounds["2026-06-02"].d[0].gates[0].closed, true);
  assert.equal(w.component._dsWriting, true);
  release();
  assert.equal((await saving).ok, 1);
  assert.equal(w.component._dsWriting, false);
});
test("Daily site image failure preserves the previous iid and leaves the editor open", async () => {
  const w = world();
  w.KIVO.BassamIDB.set = async () => false;
  w.component.state.siteModal = {
    mode: "edit",
    i: 0,
    name: "TEST_ONLY site",
    imgDirty: true,
    img: "data:image/png;base64,TEST_ONLY",
  };
  await site(w)();
  assert.equal(w.op.control.stages.length, 0);
  assert.equal(w.op.data.bassam_plan_v1.floors[0].iid, "img_test_original");
  assert.ok(w.component.state.siteModal);
});
test("adding a Daily site writes Plan and round placeholders with one matching new sid in one ticket", async () => {
  const w = world();
  w.component.state.siteModal = {
    mode: "add",
    name: "TEST_ONLY added",
    imgDirty: true,
    img: "data:image/png;base64,TEST_ONLY",
  };
  await site(w)();
  assert.equal(w.op.control.stages.length, 1);
  const body = JSON.parse(w.op.control.stages[0].body);
  assert.deepEqual(Object.keys(body).sort(), [
    "bassam_plan_v1",
    "bassam_rounds_v1",
  ]);
  const id = body.bassam_plan_v1.floors[1].sid;
  assert.ok(id.startsWith("TEST_ONLY_NEW_SITE_"));
  assert.equal(body.bassam_rounds_v1["2026-06-02"].d[1].sid, id);
  assert.equal(body.bassam_plan_v1.months["2026-06"].d[1].sid, id);
  assert.equal(body.bassam_plan_v1.floors[0].sid, "TEST_ONLY_SITE");
  assert.equal(w.component.state.siteModal, null);
});
test("lost site ACK retains the uploaded iid and retries exact bytes without a second upload", async () => {
  const w = world();
  w.component.state.siteModal = {
    mode: "edit",
    i: 0,
    name: "TEST_ONLY site",
    imgDirty: true,
    img: "data:image/png;base64,TEST_ONLY",
  };
  w.op.control.mode = "uncertain";
  const save = site(w);
  await save();
  assert.equal(w.seen.images.length, 1);
  assert.ok(w.component.state.siteModal);
  const body = w.op.control.stages[0].body;
  w.op.control.mode = "ok";
  await save();
  assert.equal(w.seen.images.length, 1);
  assert.equal(w.op.control.stages.length, 1);
  assert.equal(w.op.control.stages[0].body, body);
  assert.equal(w.op.control.sends[0], w.op.control.sends[1]);
  assert.equal(w.component.state.siteModal, null);
});
test("deleting a Daily site updates Plan and every round atomically while preserving other identities", async () => {
  const second = {
      ...floor(),
      sid: "TEST_ONLY_SECOND",
      name: "TEST_ONLY second",
    },
    w = world({
      bassam_plan_v1: {
        floors: [floor(), second],
        months: { "2026-06": { c: 2, d: [floor(), clone(second)] } },
      },
      bassam_rounds_v1: { "2026-06-02": { ap: 0, d: [floor(), clone(second)] } },
    });
  assert.equal(await w.component._delSiteEverywhere(0), true);
  assert.equal(w.op.control.stages.length, 1);
  const body = JSON.parse(w.op.control.stages[0].body);
  assert.equal(body.bassam_plan_v1.floors[0].sid, "TEST_ONLY_SECOND");
  assert.equal(body.bassam_rounds_v1["2026-06-02"].d[0].sid, "TEST_ONLY_SECOND");
  assert.equal(body.bassam_plan_v1.months["2026-06"].c, 1);
});
test("Daily import payload passes canonical codec and commits Plan/catalogs/rounds in one ticket", async () => {
  const w = world();
  importIntent(w);
  await w.component._impRun();
  assert.equal(
    w.op.control.stages.length,
    1,
    JSON.stringify(w.component.state.imp),
  );
  const body = JSON.parse(w.op.control.stages[0].body);
  assert.deepEqual(Object.keys(body).sort(), [
    "bassam_gate_opts_v1",
    "bassam_plan_v1",
    "bassam_rounds_v1",
    "bassam_zone_opts_v1",
  ]);
  assert.equal(body.bassam_rounds_v1["2026-06-04"].imp.src, "hasr");
  assert.equal(
    body.bassam_rounds_v1["2026-06-04"].d[1].sid,
    body.bassam_plan_v1.floors[1].sid,
  );
  assert.equal(
    body.bassam_rounds_v1["2026-06-04"].d[1].zones[0].readiness,
    "TEST_ONLY ready",
  );
  assert.equal(w.component.state.imp, null);
});
test("lost import ACK repeats one immutable request without another image upload or timestamp", async () => {
  const w = world();
  importIntent(w);
  w.op.control.mode = "uncertain";
  await w.component._impRun();
  assert.equal(w.seen.images.length, 1);
  assert.ok(w.component.state.imp);
  assert.equal(w.component.state.imp.busy, false);
  const body = w.op.control.stages[0].body;
  w.op.control.mode = "ok";
  await w.component._impRun();
  assert.equal(w.seen.images.length, 1);
  assert.equal(w.op.control.stages.length, 1);
  assert.equal(w.op.control.stages[0].body, body);
  assert.equal(w.op.control.sends[0], w.op.control.sends[1]);
  assert.equal(w.component.state.imp, null);
});
test("Daily field action awaits actual520 ACK and displays no success for an uncertain result", async () => {
  const w = world();
  vm.runInContext(
    fs.readFileSync("src/systems/daily/client/520-field-monitor.js", "utf8"),
    w.C,
  );
  w.component.state.dsGateFly = { kind: "gates", i: 0 };
  const rec = w.component.state.rounds["2026-06-02"],
    view = w.component._fdView(w.component.state, rec, rec.d[0].gates, 0, true);
  w.op.control.mode = "uncertain";
  await view.fdFlyFlows
    .find((value) => value.t === w.KIVO.BassamField.FLOWS.out.t)
    .pick({ stopPropagation() {} });
  assert.equal(w.op.control.stages.length, 1);
  assert.equal(w.seen.ack.length, 0);
  assert.equal(
    w.op.data.bassam_rounds_v1["2026-06-02"].d[0].gates[0].flow,
    undefined,
  );
});
test("day-shift picker waits for ACK and uses the confirmed own-shift value", async () => {
  const w = world();
  let release;
  w.KIVO.BassamDayShift = {
    get: () => "TEST_ONLY old",
    set: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  };
  const node = actions().find(
    (n) =>
      n.key.name === "pick" &&
      source.slice(n.value.start, n.value.end).includes("_selectDayShift") &&
      !source.slice(n.value.start, n.value.end).includes("dayShOpen"),
  );
  assert.ok(node);
  const pick = vm
    .runInContext(
      "(function(T,s,m,t){return (" +
        source.slice(node.value.start, node.value.end) +
        ")})",
      w.C,
    )
    .call(w.component, 2026, { month: 6 }, 2, "TEST_ONLY requested");
  const pending = pick();
  assert.equal(w.component.state.distFilterShift, undefined);
  release({ ok: 1, value: "TEST_ONLY confirmed own" });
  await pending;
  assert.equal(w.component.state.distFilterShift, "TEST_ONLY confirmed own");
});
test("Daily geometry edits preserve identities, assignment, prayer readings and gate state", async () => {
  const record = {
      ap: 0,
      d: [
        {
          ...floor(),
          zones: [
            {
              uid: "TEST_ONLY_ZONE",
              d: "M0 0L10 0L0 10Z",
              cx: 3,
              cy: 3,
              rawA: 50,
              emp: ["TEST_ONLY_EMP"],
              count: 7,
              pc: { fajr: 7 },
            },
          ],
        },
      ],
    },
    w = world({ bassam_rounds_v1: { "2026-06-02": record } });
  w.component._updRound((site) => {
    site.zones[0].cx = 5;
  });
  assert.equal((await w.component._opLastSave).ok, 1);
  const zone = w.op.data.bassam_rounds_v1["2026-06-02"].d[0].zones[0];
  assert.equal(zone.uid, "TEST_ONLY_ZONE");
  assert.equal(zone.cx, 5);
  assert.deepEqual(zone.emp, ["TEST_ONLY_EMP"]);
  assert.deepEqual(zone.pc, { fajr: 7 });
  assert.equal(zone.count, 7);
  assert.equal(
    w.op.data.bassam_rounds_v1["2026-06-02"].d[0].gates[0].uid,
    "TEST_ONLY_GATE",
  );
});
test("Daily day/month approval retains existing historical reopen semantics through typed commands", async () => {
  const w = world({
    bassam_rounds_v1: {
      "2026-06-02": { ap: 0, d: [floor()] },
      "m:2026-06": { mo: 1, dopen: { 2: 1 } },
    },
  });
  w.component.dayPastDS = () => true;
  w.component.monthPastDS = () => true;
  w.component._setRoundApLock(2026, 6, 2, 1);
  assert.equal((await w.component._opLastSave).ok, 1);
  assert.equal(w.op.data.bassam_rounds_v1["2026-06-02"].ap, 1);
  assert.equal(w.op.data.bassam_rounds_v1["2026-06-02"].d[0].ap, 1);
  assert.equal(w.op.data.bassam_rounds_v1["m:2026-06"].dopen, undefined);
  w.component._setRoundApLock(2026, 6, 2, 0);
  await w.component._opLastSave;
  assert.equal(w.op.data.bassam_rounds_v1["m:2026-06"].dopen["2"], 1);
  w.component._setMonthAp(2026, 6, true);
  await w.component._opLastSave;
  assert.equal(w.op.data.bassam_rounds_v1["m:2026-06"].ap, 1);
  assert.equal(w.op.data.bassam_rounds_v1["m:2026-06"].mo, undefined);
  w.component._setMonthAp(2026, 6, false);
  await w.component._opLastSave;
  assert.equal(w.op.data.bassam_rounds_v1["m:2026-06"].mo, 1);
});
test("Daily catalog deletion updates Plan and unapproved rounds with its catalog in one ticket", async () => {
  const make = () => ({
      ...floor(),
      zones: [
        {
          uid: "TEST_ONLY_ZONE",
          region: "R",
          level: "L",
          ser: "01",
          code: "R-L-01",
        },
      ],
    }),
    w = world({
      bassam_plan_v1: {
        floors: [make()],
        months: { "2026-06": { c: 1, d: [make()] } },
      },
      bassam_rounds_v1: {
        "2026-06-02": { ap: 0, d: [make()] },
        "2026-06-03": { ap: 1, d: [make()] },
      },
      bassam_zone_opts_v1: {
        region: [{ n: "R", c: "R" }],
        level: [{ n: "L", c: "L", r: "R" }],
        ztype: [],
        zcat: [],
        zcatStyle: {},
        hMig: 3,
      },
    });
  w.component.delZoneOpt("region", 0);
  assert.equal((await w.component._opLastSave).ok, 1);
  assert.equal(w.op.control.stages.length, 1);
  const body = JSON.parse(w.op.control.stages[0].body);
  assert.deepEqual(Object.keys(body).sort(), [
    "bassam_plan_v1",
    "bassam_rounds_v1",
    "bassam_zone_opts_v1",
  ]);
  assert.equal(body.bassam_plan_v1.floors[0].zones[0].region, "");
  assert.equal(body.bassam_plan_v1.floors[0].zones[0].level, "");
  assert.equal(body.bassam_rounds_v1["2026-06-02"].d[0].zones[0].region, "");
  assert.equal(body.bassam_rounds_v1["2026-06-03"].d[0].zones[0].region, "R");
});
test("changed prepared site intent cannot replace an uncertain ticket or upload another image", async () => {
  const w = world();
  w.component.state.siteModal = {
    mode: "edit",
    i: 0,
    name: "TEST_ONLY site",
    imgDirty: true,
    img: "data:image/png;base64,TEST_ONLY",
  };
  w.op.control.mode = "uncertain";
  const save = site(w);
  await save();
  w.component.state.siteModal = {
    ...w.component.state.siteModal,
    name: "TEST_ONLY changed",
    img: "data:image/png;base64,OTHER_TEST_ONLY",
  };
  await save();
  assert.equal(w.seen.images.length, 1);
  assert.equal(w.op.control.stages.length, 1);
  assert.equal(w.op.control.sends.length, 1);
  assert.equal(w.op.data.bassam_plan_v1.floors[0].name, "TEST_ONLY site");
});
test("late Daily image replies do not cross account or changed site/revision scope", async () => {
  for (const change of [
    (w) => (w.op.control.context.uid = "OTHER_TEST_ONLY_UID"),
    (w) => {
      w.op.revs.bassam_plan_v1++;
      w.op.data.bassam_plan_v1.floors[0].iid = "img_test_changed";
    },
  ]) {
    const w = world();
    let resolve;
    w.KIVO.BassamIDB.get = () =>
      new Promise((done) => {
        resolve = done;
      });
    w.component._loadFloorImgs();
    change(w);
    resolve("data:image/png;base64,TEST_ONLY");
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(Object.keys(w.component.state.fimgs || {}).length, 0);
  }
});
test("known import conflict leaves all confirmed business data and the import editor intact", async () => {
  const w = world();
  importIntent(w);
  const before = JSON.stringify(w.op.data);
  w.op.control.mode = "conflict";
  await w.component._impRun();
  assert.equal(JSON.stringify(w.op.data), before);
  assert.ok(w.component.state.imp);
  assert.equal(w.component.state.imp.busy, false);
  assert.equal(w.op.control.stages.length, 1);
});
/* V7 · 53 (REVIEW ١١-أ — قرارُ المراجع): سببُ إغلاق الباب اختياريّ — «تأكيد الإغلاق» بلا سبب يُغلق الباب ويُحفظ (كان gcDo يعود بلا شيء)،
   والسببُ المكتوب يُحفظ كما هو، ومؤشّرُ «الأبواب المغلقة — عدداً وسبباً» يعدّ الفارغَ «بلا سبب مسجّل» */
test("REVIEW 11-a: the Daily gate-closure dialog saves with an empty reason; the closed-gates KPI counts it as «بلا سبب مسجّل»", async () => {
  for (const why of ["", "TEST_ONLY صيانة"]) {
    const w = world();
    vm.runInContext(fs.readFileSync("src/services/410-gate-units.js", "utf8"), w.C);   /* KIVO.BassamLeaf — أبوابُ الإغلاق الورقية */
    w.component.state.gClose = { idx: [0], why, h: "10", m: "05", dd: null };
    action(w, "gcDo")();
    for (let i = 0; i < 50 && !w.op.data.bassam_rounds_v1["2026-06-02"].d[0].gates[0].closed; i++) await new Promise((r) => setTimeout(r, 10));
    const gate = w.op.data.bassam_rounds_v1["2026-06-02"].d[0].gates[0];
    assert.equal(gate.closed, true, "closed with reason «" + why + "»");
    assert.equal(gate.cWhy, why);
    assert.equal(gate.cAt, "10:05");
    assert.equal(w.component.state.gClose, null, "the dialog closes");
    let k = null;
    try { k = w.component._kDataDy([{ y: 2026, m: 6, d: 2, rec: gate && w.op.data.bassam_rounds_v1["2026-06-02"] }], [2]); } catch (e) { k = { err: String(e && e.message) }; }
    assert.ok(k && !k.err, "the KPI computes: " + JSON.stringify(k && k.err));
    assert.equal(k.gClosed, 1); assert.deepEqual(Object.keys(k.gWhy), [why || "بلا سبب مسجّل"]);
  }
});
