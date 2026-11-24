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
/* V7 · د5-ح (القفل): لا وضعَ قديماً — المحرّكُ النافذ يطلب سبباً لمفاتيح السبب (task.reopen · task.month.reopen …). الصفحةُ الحقيقية تسأله قبل
   الإرسال من طبقة التخزين (280 «السبب أولاً» · why9 ⇒ body.why) وهي غائبةٌ عن vm — فيحمل كلُّ حفظٍ هنا سبباً اصطناعياً TEST_ONLY لكل مفتاح (كما يكتبه المستخدم) */
function withReason(route, options = {}) {
  if (route !== '/api/save' || !options.body || (options.method || 'GET') === 'GET') return options;
  const body = JSON.parse(options.body), why = Object.assign({}, body.why || {});
  Object.keys(body.set || {}).concat(body.del || []).forEach((k) => { if (!why[k]) why[k] = 'TEST_ONLY سببٌ مكتوبٌ في نافذة السبب'; });
  return { ...options, body: JSON.stringify({ ...body, why }) };
}
/* V7 · 53 (basefix): أجوبةُ النقل المصطنع للمورد المخزَّن بالفترة كما يقسمه الخادم (019r opSplit · opReadOnce) — من الوثيقة الكاملة نفسِها:
   «K@» الرأسُ (حقولُ __ الثابتة) · «K@<فترة>» عضوُ الجذر (يومُ المهام y-m-d) · range «K@<شهر>» فتراتُ الشهر · index «K» فهرسُ الفترات · logical مراجعتُه.
   والحفظُ بالفترات (280 periodStage9) يُعاد إلى الوثيقة الكاملة. للموارد التي أعضاءُ جذرها فتراتٌ (المهام) — لا حقلَ حاوية. */
const PERIOD_KEY = /^(bsdept:[^:\s,@]+:(bassam_[A-Za-z0-9_]+))@([^,@]*)$/;
const periodGroup = (p) => { const m = /^(\d+-\d+)-\d+$/.exec(p); return m ? m[1] : p; };
function periodParts(doc) {
  const head = {}, periods = {};
  for (const [k, x] of Object.entries(doc && typeof doc === 'object' ? doc : {})) (k.startsWith('__') ? head : periods)[k] = x;
  return { head, periods };
}
export function periodRead(route, { get, rev, uid, epoch = 0, v = 1, denied = () => false }) {
  const q = new URL(route, 'http://x').searchParams, list = (n) => Array.from(new Set(String(q.get(n) || '').split(',').filter(Boolean)));
  const keys = list('keys'), range = list('range'), index = list('index');
  if (!keys.some((k) => PERIOD_KEY.test(k)) && !range.length && !index.length) return null;
  /* logical (مراجعةُ K المنطقية) اختياريٌّ في البروتوكول — لا يرسله هذا النقل: بصمةُ العرض تتبع النصَّ (280 periodView9) كما في الوثيقة الكاملة */
  const resources = {}, absent = [], base = {}, body = { ok: 1, uid, epoch, v, resources, absent, denied: [], base }, logical = {};
  const out = (key, has, value, r) => { if (key in base || body.denied.includes(key)) return; const m = PERIOD_KEY.exec(key); if (denied(m ? m[1] : key)) { body.denied.push(key); return; } if (has) resources[key] = value; else absent.push(key); base[key] = r; };
  const partsOf = (K) => { const d = get(K); return d === undefined ? null : periodParts(d); };
  for (const key of keys) {
    const m = PERIOD_KEY.exec(key);
    if (!m) { const d = get(key); out(key, d !== undefined, d, rev(key)); continue; }
    const K = m[1], p = m[3], P = partsOf(K); logical[K] = rev(K);
    if (p === '') out(key, !!P, P && P.head, rev(K)); else out(key, !!P && Object.hasOwn(P.periods, p), P && P.periods[p], rev(K));
  }
  if (range.length) {
    body.ranges = {};
    for (const r of range) {
      const i = r.lastIndexOf('@'), K = r.slice(0, i), g = r.slice(i + 1), P = partsOf(K);
      if (denied(K)) continue;   /* محجوب: لا مدى (الخادمُ كذلك — 280 يقبل غيابه مع «K@» محجوباً) */
      body.ranges[r] = Object.keys(P ? P.periods : {}).filter((p) => periodGroup(p) === g).map((p) => K + '@' + p);
      body.ranges[r].forEach((pk) => out(pk, true, P.periods[pk.slice(K.length + 1)], rev(K))); logical[K] = rev(K);
    }
  }
  if (index.length) { body.index = {}; for (const K of index) { const P = partsOf(K); body.index[K] = Object.keys(P ? P.periods : {}).map((p, seq) => ({ p, grp: periodGroup(p), seq, rev: rev(K) })); } }
  return body;
}
/* الحفظُ بالفترات ⇒ الوثيقةُ الكاملة: set/del بمفاتيح «K@…» تُدمج في K · ويُعاد ما سواها كما هو. { set, del, periodic: [K…] } */
export function periodSave(body, get) {
  const set = {}, del = [], docs = {}, doc = (K) => (docs[K] || (docs[K] = (() => { const d = get(K); return d && typeof d === 'object' ? JSON.parse(JSON.stringify(d)) : {}; })()));
  for (const [key, text] of Object.entries(body.set || {})) {
    const m = PERIOD_KEY.exec(key); if (!m) { set[key] = text; continue; }
    const D = doc(m[1]), x = JSON.parse(text);
    if (m[3] === '') { for (const k of Object.keys(D)) if (k.startsWith('__')) delete D[k]; Object.assign(D, x && typeof x === 'object' ? x : {}); } else D[m[3]] = x;
  }
  for (const key of body.del || []) { const m = PERIOD_KEY.exec(key); if (!m) { del.push(key); continue; } delete doc(m[1])[m[3]]; }
  for (const [K, D] of Object.entries(docs)) set[K] = JSON.stringify(D);
  return { set, del };
}
/* فتراتُ كلِّ موردٍ مقسوم من فهرس الخادم (280 index → want) — ما كانت الصفحةُ ستطلبه ثم تعيد قراءته بخبر «bassam:remote» الذي لا يصل vm */
export async function loadAllPeriods(operations) {
  if (!operations.split) return;
  for (const name of operations.resources) {
    if (!operations.split(name)) continue;
    const ix = await operations.index(name);
    assert.equal(ix.ok, 1, "period index " + name + ": " + JSON.stringify(ix));
    const periods = ix.index.map((x) => x.p);
    if (periods.length) { const r = await operations.want(name, { periods, quiet: true }); assert.equal(r.ok, 1, "period load " + name + ": " + JSON.stringify(r)); }
  }
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
            const P = periodRead(route, { uid, v, get: (K) => (store.has(K.split(":").at(-1)) ? JSON.parse(store.get(K.split(":").at(-1))) : undefined), rev: (K) => base.get(K) || 1 });   /* V7 · 53 */
            if (P) return response(P);
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
            /* V7 · 53: مفاتيحُ الفترات تُدمج في الوثيقة الكاملة، ولكلِّ مفتاحٍ أُرسل مراجعتُه */
            const whole = periodSave(body, (K) => (store.has(K.split(":").at(-1)) ? JSON.parse(store.get(K.split(":").at(-1))) : undefined));
            for (const key of Object.keys(body.set || {}).concat(body.del || [])) { const m = /^(.*)@[^@]*$/.exec(key); if (m) { base.set(m[1], v); revs[key] = v; } }
            for (const [key, text] of Object.entries(whole.set)) {
              store.set(key.split(":").at(-1), text);
              base.set(key, v);
              if (Object.hasOwn(body.set || {}, key)) revs[key] = v;
            }
            for (const key of whole.del) {
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
     مقسومٍ كلُّها من فهرس الخادم (280 index → want) قبل بناء الصفحة وعند كلِّ مزامنة — كأن الصفحةَ أكملت تحميلَ ما طلبته */
  const loadPeriods = () => loadAllPeriods(operations);
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
