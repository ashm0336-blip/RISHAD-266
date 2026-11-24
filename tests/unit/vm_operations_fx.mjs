/* Explicit test transport for the current Operations protocol. Production 280
   owns all reads/drafts/tickets/ACK validation; no retired /api/get adapter. */
import assert from "node:assert/strict";
import { afterEach } from "node:test";
import { loadClient } from "./k264_vm.mjs";
import { periodRead, periodSave, periodIndex, loadAllPeriods } from "./periods_fake_fx.mjs";   /* V7 · 53 */

const tabs = new Set();
afterEach(() => {
  for (const tab of tabs) tab.dispose();
  tabs.clear();
});
const response = (value) =>
  new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });
/* V7 · د5-ح (القفل): لا وضعَ قديماً — المحرّكُ النافذ يطلب سبباً لمفاتيح السبب (task.reopen · task.month.reopen …). الصفحةُ الحقيقية تسأله قبل
   الإرسال من طبقة التخزين (280 «السبب أولاً» · why9 ⇒ body.why) وهي غائبةٌ عن vm — فيحمل كلُّ حفظٍ هنا سبباً اصطناعياً TEST_ONLY لكل مفتاح (كما يكتبه المستخدم) */
function withReason(route, options = {}) {
  if (route !== '/api/save' || !options.body || (options.method || 'GET') === 'GET') return options;
  const body = JSON.parse(options.body), why = Object.assign({}, body.why || {});
  Object.keys(body.set || {}).concat(body.del || []).forEach((k) => { if (!why[k]) why[k] = 'TEST_ONLY سببٌ مكتوبٌ في نافذة السبب'; });
  return { ...options, body: JSON.stringify({ ...body, why }) };
}
export async function attachTaskOperations(
  ctx,
  {
    store = new Map(),
    W,
    ck,
    uid = "tst_dm1",
    dept = "tst_d1",
    /* V7 · د5-ح: نافذةُ السبب (280 askReason) محاكاةً على الخادم الحقيقي — يكتب المستخدمُ سبباً TEST_ONLY */
    askReason = W ? (k, keys, cb) => setTimeout(() => cb("TEST_ONLY سببٌ مكتوبٌ في نافذة السبب"), 0) : undefined,
  } = {},
) {
  ctx.crypto = globalThis.crypto;
  if (W && typeof ctx.fetch === 'function') { const f0 = ctx.fetch; ctx.fetch = (route, options) => f0(route, withReason(String(route), options)); }   /* V7 · د5-ح: والحفظُ من الصفحة مباشرةً كذلك */
  const base = new Map(),
    calls = [];
  let v = 1;
  const C = W
    ? { req: (route, options) => W.C.req(route, { ...withReason(route, options), cookie: ck }) }
    : {
        req: async (route, options = {}) => {
          if (route.startsWith("/api/operations/read?")) {
            const resources = {},
              absent = [],
              revs = {},
              /* V7 · 53: الموارد المخزّنة بالفترة بسلكها (K@ · K@p · range= · index=) — tests/unit/periods_fake_fx.mjs */
              url = new URL(route, "http://x"),
              docs = Object.fromEntries([...store].map(([k, t]) => [k, JSON.parse(t)])),
              out = { resources, absent, base: revs };
            periodIndex(url, docs, (k) => base.get(k) || 1, out);
            for (const key of periodRead(url, docs, (k) => base.get(k) || 1, out)) {
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
              ranges: out.ranges,
              ...(out.index ? { index: out.index } : {}),
            });
          }
          if (route === "/api/save") {
            const body = JSON.parse(options.body);
            calls.push(body);
            const revs = {};
            v++;
            const pdocs = Object.fromEntries([...store].map(([k, t]) => [k, JSON.parse(t)])),
              pkeep = (key) => { const name = key.split(":").at(-1).replace(/@.*$/, ""); if (pdocs[name] !== undefined) store.set(name, JSON.stringify(pdocs[name])); };
            for (const [key, text] of Object.entries(body.set || {})) {
              if (periodSave(key, JSON.parse(text), pdocs)) { pkeep(key); base.set(key, v); revs[key] = v; continue; }
              store.set(key.split(":").at(-1), text);
              base.set(key, v);
              revs[key] = v;
            }
            for (const key of body.del || []) {
              if (periodSave(key, undefined, pdocs)) { pkeep(key); base.set(key, v); revs[key] = v; continue; }
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
  /* V7 · 53 (basefix): المورد المخزَّن بالفترة (المهام · الخطة · الجدول … — 280 split) يُقرأ رأسُه وحده بقراءة المفتاح المنطقي، وتطلب الصفحةُ
     أشهرَها (want) ثم تعيد القراءة بخبر «bassam:remote» — والصفحةُ هنا في vm آخر لا يصله الخبر، وتُرسم متزامنةً. فتُحمَّل هنا فتراتُ كلِّ موردٍ
     مقسومٍ كلُّها من فهرس الخادم (280 index → want) قبل بناء الصفحة وعند كلِّ مزامنة — كأن الصفحةَ أكملت تحميلَ ما طلبته. على العامل الحقيقي وحده */
  const loadPeriods = () => loadAllPeriods(operations);   /* periods_fake_fx — العاملُ الحقيقي والنقلُ المصطنع معاً */
  await loadPeriods();
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
      await loadPeriods();   /* V7 · 53: وفتراتٌ جديدة أضافها الخادم */
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
