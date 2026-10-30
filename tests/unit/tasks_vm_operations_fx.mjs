/* Explicit test transport for the current Operations protocol. Production 280
   owns all reads/drafts/tickets/ACK validation; no retired /api/get adapter. */
import assert from "node:assert/strict";
import { afterEach } from "node:test";
import { loadClient } from "./k264_vm.mjs";

const tabs = new Set();
afterEach(() => {
  for (const tab of tabs) tab.dispose();
  tabs.clear();
});
const response = (value) =>
  new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });
export async function attachTaskOperations(
  ctx,
  {
    store = new Map(),
    W,
    ck,
    uid = "tst_dm1",
    dept = "tst_d1",
    askReason,
  } = {},
) {
  ctx.crypto = globalThis.crypto;
  const base = new Map(),
    calls = [];
  let v = 1;
  const C = W
    ? { req: (route, options) => W.C.req(route, { ...options, cookie: ck }) }
    : {
        req: async (route, options = {}) => {
          if (route.startsWith("/api/operations/read?")) {
            const resources = {},
              absent = [],
              revs = {};
            for (const key of new URL(route, "http://x").searchParams
              .get("keys")
              .split(",")) {
              const name = key.split(":").at(-1);
              revs[key] = base.get(key) || 1;
              if (store.has(name)) resources[key] = JSON.parse(store.get(name));
              else absent.push(key);
            }
            return response({
              ok: 1,
              uid,
              epoch: 0,
              v,
              resources,
              absent,
              denied: [],
              base: revs,
            });
          }
          if (route === "/api/save") {
            const body = JSON.parse(options.body);
            calls.push(body);
            const revs = {};
            v++;
            for (const [key, text] of Object.entries(body.set || {})) {
              store.set(key.split(":").at(-1), text);
              base.set(key, v);
              revs[key] = v;
            }
            for (const key of body.del || []) {
              store.delete(key.split(":").at(-1));
              base.set(key, v);
              revs[key] = v;
            }
            return response({
              ok: 1,
              requestId: body.requestId,
              epoch: body.epoch,
              atomic: 1,
              revs,
            });
          }
          return response({ v, keys: [] });
        },
      };
  const T = loadClient({
    C,
    boot: { srv: 1, cf: 1, uid, v: 1, keys: {}, revs: {} },
  });
  tabs.add(T);
  T.W.document.hidden = true;
  T.W.KIVO.BassamAuth = {
    user: () =>
      ctx.KIVO.BassamAuth?.user?.() || {
        id: uid,
        deptId: dept,
        role: "staff",
        mgr: true,
      },
  };
  T.W.KIVO.BassamDepts = {
    active: () => ctx.KIVO.BassamDepts?.active?.() || dept,
  };
  const service = T.W.KIVO.__BS_SRV,
    operations = service.operations;
  ctx.KIVO.__BS_SRV = askReason ? { ...service, askReason } : service;
  const result = await operations.read(
    operations.resources.map((name) => "bsdept:" + dept + ":" + name),
  );
  assert.equal(
    result.ok,
    1,
    "A component may be constructed only after the real Operations read acknowledges its preload",
  );
  // Existing tests retain a Map for device preferences and assertion access.
  // Its business reads are confirmed in-memory projections, never Storage.
  if (W) {
    const get = store.get.bind(store);
    store.get = (name) =>
      operations.resources.includes(String(name))
        ? operations.text(name)
        : get(name);
  }
  const storage = ctx.localStorage;
  for (const name of ["getItem", "setItem", "removeItem"]) {
    const original = storage[name].bind(storage);
    storage[name] = (key, ...args) => {
      if (operations.resources.includes(String(key).split(":").at(-1)))
        throw Error("TEST_ONLY retired business Storage access: " + key);
      return original(key, ...args);
    };
  }
  return {
    T,
    operations,
    service: ctx.KIVO.__BS_SRV,
    calls,
    replace: async (name, value) => {
      assert.equal(
        !!W,
        false,
        "Real Worker fixtures must change through canonical SQLite helpers",
      );
      store.set(name, JSON.stringify(value));
      base.set("bsdept:" + dept + ":" + name, ++v);
      const result = await operations.read(["bsdept:" + dept + ":" + name]);
      assert.equal(result.ok, 1);
    },
    sync: async () => {
      const result = await operations.read(
        operations.resources.map((name) => "bsdept:" + dept + ":" + name),
      );
      assert.equal(result.ok, 1);
      return result;
    },
    text: (name) => JSON.stringify(operations.get(name)),
  };
}

export async function taskRead(W, ck, keys) {
  const response = await W.C.api(
    "/api/operations/read?keys=" + encodeURIComponent(keys.join(",")),
    { cookie: ck },
  );
  assert.equal(response.status, 200, JSON.stringify(response.j));
  assert.equal(response.j.ok, 1);
  return response.j;
}
export function taskText(dto, key, absentValue = {}) {
  assert.equal(dto.ok, 1);
  assert.equal(
    (dto.denied || []).includes(key),
    false,
    "Fixture requires a readable resource: " + key,
  );
  if (Object.hasOwn(dto.resources, key))
    return JSON.stringify(dto.resources[key]);
  assert.ok(
    dto.absent.includes(key),
    "Resource must be confirmed present or absent: " + key,
  );
  return JSON.stringify(absentValue);
}
let saveSequence = 0;
export async function saveTaskDocuments(W, ck, set) {
  const current = await taskRead(W, ck, Object.keys(set));
  return W.C.api("/api/save", {
    method: "POST",
    cookie: ck,
    body: {
      requestId: "TEST_ONLY_VM_Operations_" + ++saveSequence,
      epoch: current.epoch,
      set,
      del: [],
      base: current.base,
    },
  });
}
