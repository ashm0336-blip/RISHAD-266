/* Actual Admin renderVals/scLoadReferences, synthetic dependency fixtures.
   No client/backend policy, account/delete/scope action or cloud transport. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("src/modules/admin/logic.js", "utf8");
const view = fs.readFileSync("src/modules/admin/view.html", "utf8");
const clone = (value) => JSON.parse(JSON.stringify(value));
function fixture({
  departments = [],
  nodes = [],
  active = null,
  selected = "",
  tab = "emps",
} = {}) {
  const effects = {
    references: [],
    reads: [],
    contexts: 0,
    writes: [],
    scopeCalls: 0,
  };
  const list = clone(departments),
    groups = clone(nodes);
  const depts = {
    active: () => active,
    activeName: () => list.find((dept) => dept.id === active)?.name || "",
    list: () => list,
    treeFlat: () => list,
    nodes: () => groups,
    groups: () => groups,
    nodeOf: (id) => groups.find((node) => node.id === id),
    ancestorsOf: () => [],
    parentIdOf: (id) => groups.find((node) => node.id === id)?.pid || "",
    groupIdOf: (id) => list.find((dept) => dept.id === id)?.gid || "",
    groupName: () => "",
    pathOf: () => [],
    deptsUnder: () => [],
    needsStructure: () => false,
    nodeKinds: () => [],
    context: () => ({
      state: list.length ? "ready" : "empty",
      dept: active,
      message: list.length ? "" : "لا توجد إدارة — أضف إدارة من إعدادات المنصة",
    }),
    raw: { getItem: () => null },
  };
  const operations = {
    context: () => {
      effects.contexts++;
      return {
        uid: "TEST_ONLY_OWNER",
        dept: active || "TEST_ONLY_OTHER_CONTEXT",
        epoch: 2,
      };
    },
    reference: (key) => {
      effects.references.push(key);
      if (key.includes("bsdept::")) throw Error("TEST_ONLY_INVALID_SCOPE");
      return [];
    },
    get: () => [],
    ready: () => false,
    read: async (keys) => {
      effects.reads.push([...keys]);
      return { ok: 0 };
    },
  };
  const permission = {
    PAGE_REG: [],
    hasCap: () => false,
    rawCap: () => [],
    deptCap: () => [],
    subOn: () => true,
    on: () => true,
  };
  const count = Object.assign((value) => String(value), {
    agr: (_n, one, many) => many || one,
    pair: (n, word) => String(n) + " " + word,
    word: (_n, word) => word,
  });
  const KIVO = {
    __ADMIN_MODE: "site",
    BassamPageKit: { base: () => class {} },
    BassamDepts: depts,
    BassamPerm: permission,
    BassamAuth: {
      isSuper: () => true,
      user: () => ({ id: "TEST_ONLY_OWNER", role: "super" }),
      users: () => [],
      deptManager: () => null,
      groupManager: () => null,
      isMgrKey: () => false,
    },
    BassamFind: { filter: (_query, rows) => rows },
    BassamCount: count,
    __BS_SRV: { operations },
  };
  const C = {
    KIVO,
    DCLogic: class {},
    __BS_BOOT: { cf: 1, srv: 1, uid: "TEST_ONLY_OWNER" },
    location: { hash: "#/sysadmin/depts" },
    setTimeout,
    clearTimeout,
    Date,
    console,
    document: { getElementById: () => null },
    localStorage: {
      getItem: () => null,
      setItem: (...args) => {
        effects.writes.push(args);
        throw Error("No write in render");
      },
      removeItem: (...args) => {
        effects.writes.push(args);
        throw Error("No delete in render");
      },
    },
  };
  C.window = C;
  vm.createContext(C);
  vm.runInContext(source + "\nglobalThis.TEST_ONLY_Admin=Component;", C);
  const page = Object.create(C.TEST_ONLY_Admin.prototype);
  page.state = {
    admTab: "depts",
    sysSel: selected,
    sysTab: tab,
    usrPage: 1,
    usrPerPage: 10,
  };
  page.setState = (patch) => {
    page.state = {
      ...page.state,
      ...(typeof patch === "function" ? patch(page.state) : patch),
    };
  };
  for (const name of [
    "_adPermVals",
    "plVals",
    "adVals",
    "impVals",
    "sfVals",
    "tpVals",
    "scMgrVals",
    "_expInfo",
    "_gmRec",
    "_upDeptOf",
    "up24Model",
    "tp24Base",
  ])
    page[name] = () => ({});
  page._admTabsNow = () => ({ l: "depts", h: "depts" });
  page._hashTab = () => {};
  page._nodeRows = (_depts, _state, rows) => rows;
  page._parentOpts = () => [];
  page._gmKind = () => "TEST_ONLY node";
  page.t24On = () => false;
  page._unSplit = () => ({});
  page.bsOn = () => true;
  page.bsKeyCap = () => "";
  page.bsAck = () => {};
  page.bsToast = () => {};
  return { page, effects, depts, operations, render: () => page.renderVals() };
}

test("actual Admin render with no registered selection shows an honest empty detail and no invalid operational reference", async () => {
  const B = fixture(),
    values = B.render();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(values.deptDetailReady, false);
  assert.equal(values.deptDetailEmpty, true);
  assert.equal(values._sel, "");
  assert.match(values.deptDetailMessage, /لا توجد إدارة/);
  assert.equal(values.deptRows.length, 0);
  assert.equal(values.admOnDepts, true);
  assert.deepEqual(B.effects.references, []);
  assert.deepEqual(B.effects.reads, []);
  assert.deepEqual(B.effects.writes, []);
  assert.equal(
    typeof values.ndToggle,
    "function",
    "Hierarchy creation remains available",
  );
  assert.equal(
    typeof values.admGoPlat,
    "function",
    "General platform settings remain available",
  );
});

test("stale invented d1 and collapsed detail state cannot create a fake department card or references", async () => {
  const B = fixture({ active: "d1", selected: "d1", tab: "scope" });
  B.page.state.dlShut = true;
  const values = B.render();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(values.deptDetailReady, false);
  assert.equal(values.deptDetailEmpty, true);
  assert.equal(values._sel, "");
  assert.ok(!values.mdGridStyle.includes("56px"));
  assert.deepEqual(B.effects.references, []);
  assert.deepEqual(B.effects.reads, []);
  assert.equal(values.dhSwitch, undefined);
  assert.equal(values.dhDel, undefined);
  assert.equal(values.capSaveDo, undefined);
});

test("real registered departments and actual hierarchy nodes retain their existing detail types and actions", () => {
  const department = { id: "TEST_ONLY_DEPT", name: "TEST_ONLY department" },
    node = {
      id: "TEST_ONLY_NODE",
      name: "TEST_ONLY hierarchy",
      kind: "TEST_ONLY kind",
    };
  const dept = fixture({
    departments: [department],
    active: department.id,
    selected: department.id,
  }).render();
  assert.equal(dept.deptDetailReady, true);
  assert.equal(dept.deptDetailEmpty, false);
  assert.equal(dept.selName, department.name);
  assert.equal(dept.selIsDept, true);
  assert.equal(dept.selIsNode, false);
  assert.equal(typeof dept.selRename, "function");
  const group = fixture({ nodes: [node], selected: node.id }).render();
  assert.equal(group.deptDetailReady, true);
  assert.equal(group.selName, node.name);
  assert.equal(group.selIsNode, true);
  assert.equal(group.selIsDept, false);
  assert.equal(typeof group.dhAdd, "function");
});

test("scLoadReferences refuses empty/stale/node scopes before touching operations; a registered scope retains read behavior", async () => {
  const dept = { id: "TEST_ONLY_DEPT", name: "TEST_ONLY department" },
    node = { id: "TEST_ONLY_NODE", name: "TEST_ONLY node" };
  const B = fixture({ departments: [dept], nodes: [node], active: dept.id });
  for (const id of ["", null, "d1", node.id])
    assert.equal(await B.page.scLoadReferences(id, true), false);
  assert.equal(B.effects.contexts, 0);
  assert.deepEqual(B.effects.reads, []);
  assert.deepEqual(B.effects.references, []);
  assert.equal(
    await B.page.scLoadReferences(dept.id, true),
    false,
    "Unacknowledged transport stays false",
  );
  assert.equal(B.effects.reads.length, 1);
  assert.deepEqual(B.effects.reads[0], [
    "bsdept:" + dept.id + ":bassam_plan_v1",
    "bsdept:" + dept.id + ":bassam_employees_v1",
  ]);
});

test("the actual template gates every existing selected-detail action while leaving hierarchy controls outside the guard", () => {
  const start = view.indexOf('<sc-if value="{{deptDetailReady}}"');
  assert.ok(start >= 0, "Selection guard is in the real template");
  const tags = /<\/?sc-if\b[^>]*>/g;
  tags.lastIndex = start;
  let depth = 0,
    end = -1,
    match;
  while ((match = tags.exec(view))) {
    if (match[0].startsWith("</")) depth--;
    else depth++;
    if (depth === 0) {
      end = tags.lastIndex;
      break;
    }
  }
  assert.ok(end > start);
  const selected = view.slice(start, end);
  for (const binding of [
    "{{selName}}",
    "{{dhSwitch}}",
    "{{dhMenuTog}}",
    "{{tabEmpsLbl}}",
    "{{capSaveDo}}",
  ])
    assert.ok(selected.includes(binding), binding);
  assert.ok(view.includes("{{deptDetailMessage}}"));
  assert.ok(
    view.indexOf("{{deptCount}}") > end,
    "Hierarchy remains outside selected detail",
  );
});
