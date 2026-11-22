/* Actual Admin renderVals/scLoadReferences, synthetic dependency fixtures.
   No client/backend policy, account/delete/scope action or cloud transport.
   V7 · د6: the structure page, the unit page and their tree moved to the separate «الإدارات والصلاحيات» page (src/modules/org); the unit and the tab
   are read from its address alone. What this page still owns for a selected unit are the two slots it hands to that screen — «المسؤولون» (the accounts
   card) and «البيانات» (the unit data section). The same honesty rules are pinned here on those slots: no registered selection ⇒ no slot, no
   operational reference, no action; a stale invented id cannot create one. (The screen's own fallback for an unknown unit: v7_d6_frame.test.mjs.) */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("src/modules/admin/logic.js", "utf8");   /* V7 · د6: جزءُ «الصلاحيات» (logic-perm44.js) نُقل إلى صفحة الشاشة */
const routeSrc = fs.readFileSync("src/services/325-org-route.js", "utf8");
const view = fs.readFileSync("src/modules/admin/view.html", "utf8");
const clone = (value) => JSON.parse(JSON.stringify(value));
function fixture({
  departments = [],
  nodes = [],
  active = null,
  selected = "",
  tab = "overview",   /* V7 · د6: تبويبُ الشاشة من عنوانها (overview · admins · data …) */
  mounted = true,     /* الشاشةُ مركَّبة وسجّلت واجهتَها (KIVO.BassamOrgRoute.screen) */
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
    location: { hash: "#/sysadmin/org" },
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
  vm.runInContext(routeSrc, C);
  /* الشاشةُ تجيب بما في عنوانها كما هو — والتحقّقُ من أنّ الوحدة مسجَّلة على هذه الصفحة (_orgUnitNow ← _orgKnown) */
  if (mounted) KIVO.BassamOrgRoute.screen = { route: () => ({ mode: "site", unit: selected || KIVO.BassamOrgRoute.ROOT, tab }) };
  vm.runInContext(source + "\nglobalThis.TEST_ONLY_Admin=Component;", C);
  const page = Object.create(C.TEST_ONLY_Admin.prototype);
  page.state = {
    admTab: "depts",
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
    "_expInfo",
    "_gmRec",
    "_upDeptOf",
    "up24Model",
    "tp24Base",
  ])
    page[name] = () => ({});
  page._admTabsNow = () => ({ l: "depts", h: "depts" });
  page._hashTab = () => {};
  page._gmKind = () => "TEST_ONLY node";
  page.t24On = () => false;
  page._unSplit = () => ({});
  page.bsOn = () => true;
  page.bsKeyCap = () => "";
  page.bsAck = () => {};
  page.bsToast = () => {};
  return { page, effects, depts, operations, render: () => page.renderVals() };
}

test("actual Admin render with no registered selection hands the screen no slot and makes no invalid operational reference", async () => {
  for (const B of [fixture(), fixture({ mounted: false }), fixture({ tab: "admins" }), fixture({ tab: "data" })]) {
    const values = B.render();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(values.admOnDepts, true);
    assert.equal(values.orgOn, true, "the screen is mounted in its place");
    assert.equal(values.orgHost.mode, "site");
    assert.equal(values.orgSlotAdmins, false);
    assert.equal(values.orgSlotData, false);
    assert.equal(values.dhSwitch, undefined);
    assert.equal(values.dhWipe, undefined);
    assert.equal(values.mgAdd, undefined);
    assert.deepEqual(B.effects.references, []);
    assert.deepEqual(B.effects.reads, []);
    assert.deepEqual(B.effects.writes, []);
    assert.equal(typeof values.admGoPlat, "function", "General platform settings remain available");
    for (const gone of ["deptRows", "ndToggle", "deptDetailReady", "selName", "selRename", "selSetGid", "dhDel", "dhAdd", "goTabPerm", "p44Show", "p44SysReview", "_sel"])
      assert.equal(gone in values, false, gone + " left this page with the structure and unit pages");
  }
});

test("a stale invented d1 in the address cannot create a fake department slot or references", async () => {
  for (const tab of ["admins", "data", "overview"]) {
    const B = fixture({ active: "d1", selected: "d1", tab });
    const values = B.render();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(values.orgSlotAdmins, false);
    assert.equal(values.orgSlotData, false);
    assert.deepEqual(B.effects.references, []);
    assert.deepEqual(B.effects.reads, []);
    assert.equal(values.dhSwitch, undefined);
    assert.equal(values.dhWipe, undefined);
    assert.equal(values.dhImpPick, undefined);
    assert.equal(values.mgAdd, undefined);
  }
});

test("real registered departments and actual hierarchy nodes get the slot of the tab in the address, with their existing types and actions", () => {
  const department = { id: "TEST_ONLY_DEPT", name: "TEST_ONLY department" },
    node = {
      id: "TEST_ONLY_NODE",
      name: "TEST_ONLY hierarchy",
      kind: "TEST_ONLY kind",
    };
  const D = (tab, active = department.id) => fixture({ departments: [department], active, selected: department.id, tab });
  /* «المسؤولون»: the accounts card of the unit */
  let B = D("admins"), dept = B.render();
  assert.equal(dept.orgSlotAdmins, true);
  assert.equal(dept.orgSlotData, false);
  assert.equal(dept.dhIsDept, true);
  assert.equal(dept.dhIsNode, false);
  assert.equal(dept.mgAddOn, true, "only the platform admin adds a manager");
  assert.equal(typeof dept.mgAdd, "function");
  assert.equal(dept.mgTitle, "مديرو الإدارة");
  assert.deepEqual(B.effects.references, ["bsdept:" + department.id + ":bassam_employees_v1"], "the registered unit's reference, as before");
  /* «البيانات»: export only from the active unit; import · wipe with their existing handlers; no delete here (it lives in the overview) */
  dept = D("data").render();
  assert.equal(dept.orgSlotData, true);
  assert.equal(dept.orgSlotAdmins, false);
  assert.equal(dept.dhActive, true);
  assert.equal(dept.dhNotActive, false);
  for (const k of ["dhExp", "dhImpPick", "dhImpStop", "dhWipe", "dhSwitch"]) assert.equal(typeof dept[k], "function", k);
  assert.equal(dept.dhDel, undefined);
  assert.equal(D("data", "TEST_ONLY_OTHER").render().dhNotActive, true);
  /* another tab of the same unit: nothing computed for the slots */
  B = D("roles"); dept = B.render();
  assert.equal(dept.orgSlotAdmins, false);
  assert.equal(dept.orgSlotData, false);
  assert.deepEqual(B.effects.references, []);
  /* a supervisory node: its managers card; no data slot (a node holds no data) and no unit reference */
  B = fixture({ nodes: [node], selected: node.id, tab: "admins" });
  const group = B.render();
  assert.equal(group.orgSlotAdmins, true);
  assert.equal(group.dhIsNode, true);
  assert.equal(group.dhIsDept, false);
  assert.equal(group.mgTitle, "مديرو TEST_ONLY node");
  assert.deepEqual(B.effects.references, []);
  assert.equal(fixture({ nodes: [node], selected: node.id, tab: "data" }).render().orgSlotData, false);
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

test("the actual template mounts the screen once and gates each slot's existing actions by its own guard", () => {
  const block = (open) => {
    const start = view.indexOf(open);
    assert.ok(start >= 0, open + " is in the real template");
    const tags = /<\/?sc-if\b[^>]*>/g;
    tags.lastIndex = start;
    let depth = 0, match;
    while ((match = tags.exec(view))) {
      if (match[0].startsWith("</")) depth--;
      else depth++;
      if (depth === 0) return view.slice(start, tags.lastIndex);
    }
    assert.fail("unbalanced " + open);
  };
  assert.equal(view.split('<dc-import name="Org"').length, 2, "one mount of the screen for both places (the same component)");
  const mount = block('<sc-if value="{{orgOn}}"');
  assert.match(mount, /<dc-import name="Org" host="\{\{orgHost\}\}"/);
  const admins = block('<sc-if value="{{orgSlotAdmins}}"'), data = block('<sc-if value="{{orgSlotData}}"');
  assert.ok(mount.includes(admins) && mount.includes(data), "both slots are children of the mounted screen");
  assert.match(mount, /<div data-org-slot="admins">\s*<sc-if value="\{\{orgSlotAdmins\}\}"/);
  assert.match(mount, /<div data-org-slot="data">\s*<sc-if value="\{\{orgSlotData\}\}"/);
  for (const binding of ["{{mgTitle}}", "{{mgAdd}}", "{{mgAddOn}}", "{{ndRows}}", "{{ndOnQ}}", "{{u.rmToggle}}", "{{dhSwitch}}"]) assert.ok(admins.includes(binding), "admins slot: " + binding);
  for (const binding of ["{{dhExp}}", "{{dhImpPick}}", "{{dhWipe}}", "{{dhActive}}", "{{dhNotActive}}"]) assert.ok(data.includes(binding), "data slot: " + binding);
  assert.ok(!data.includes("{{dhDel}}") && !view.includes("{{dhDel}}"), "delete is offered in the screen's overview only");
  /* every selected-unit binding lives inside a slot guard — nothing of the old unit page is left outside */
  const rest = view.replace(admins, "").replace(data, "");
  for (const binding of ["{{mgAdd}}", "{{ndRows}}", "{{dhExp}}", "{{dhImpPick}}", "{{dhWipe}}", "{{dhSwitch}}", "{{selName}}", "{{selRename}}", "{{goTabPerm}}", "{{goTabData}}", "{{deptRows}}", "{{deptDetailMessage}}", "{{p44Show}}", "{{p44SysReview}}", "{{ndGo}}"])
    assert.ok(!rest.includes(binding), binding + " is not rendered outside the slots");
});
