/* V7 · د6 — عُدّةُ اختبارات الاستيراد على أجزاء (TEST_ONLY · بياناتٌ مولَّدة في الذاكرة وحدها — لا ملفَّ حقيقياً ولا بياناتِ أشخاص).
   · legacyDocs(): وثائقُ تشغيلٍ بشكلها القديم (كما يقرؤها /api/operations/read) من بيانات العرض TEST_ONLY على مختبرٍ مصدرٍ مستقل.
   · oldFile({ scale, small }): نسخةُ إدارةٍ بشكل Production القديم كما قيس على الملف الحقيقي (بنيتُه وأحجامُه وحدها — REPLY_D6 بند 9):
       app · version:3 · kind:'dept' · dept · exportedAt · data · perms · idbImages · preImport:false — بلا domains ولا manifest؛
       كلُّ قيمةٍ في data نصُّ JSON أو null؛ ≈31MB: جولاتٌ ≈8.4MB (26 يوماً) · مخططٌ ≈1.2MB · تنبيهاتٌ ≈0.23MB · 10 صور (9 png من 1.48 إلى 3.37MB وjpeg 0.49MB).
       scale:2 ⇒ ضعفُ الحجم (52 يوماً و20 صورة) · small ⇒ نسخةٌ صغيرة بالبنية نفسِها (لاختبارات البروتوكول والمتصفح).
   · target(): مختبرٌ هدفٌ (العاملُ المبنيّ الحقيقي على SQLite في الذاكرة) وعميلُ طلباتٍ بكعكة الجلسة.
   · protocol(): سائقُ البروتوكول خطوةً خطوة (begin · part · inspect · commit · cancel) — للقطع والتكرار والطلب المصنوع يدوياً. */
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { startLab, LAB } from '../browser/local_server.mjs';

export { LAB };
export const SEG = { f: 1000000, i: 4000000 };
const CTX = { waitUntil() {}, passThroughOnException() {} }, ORIGIN = 'https://lab.local';

export function client(lab) {
  const call = async (p, o = {}) => {
    const h = {};
    if (o.ck) h.cookie = o.ck;
    if (o.body !== undefined) { h.origin = ORIGIN; h['Content-Type'] = 'application/json'; }
    const r = await lab.W.default.fetch(new Request(ORIGIN + p, { method: o.method || (o.body !== undefined ? 'POST' : 'GET'), headers: h, body: o.body === undefined ? undefined : typeof o.body === 'string' ? o.body : JSON.stringify(o.body) }), lab.env, CTX);
    const t = await r.text();
    let j = null;
    try { j = JSON.parse(t); } catch (e) { /* نصٌّ خام (صورة) */ }
    return { status: r.status, j, t, h: r.headers };
  };
  const login = async (u, p) => { const r = await call('/api/login', { body: { u, p } }); assert.equal(r.status, 200, 'login ' + r.t.slice(0, 120)); return { ck: (r.h.get('set-cookie') || '').split(';')[0], uid: r.j.u && r.j.u.id }; };
  return { call, login };
}
export async function target(extra = {}) {
  const lab = await startLab();
  Object.assign(lab.env, extra);
  const C = client(lab), su = await C.login(LAB.superUn, LAB.superPw);
  su.uid = su.uid || lab.env.DB.q('SELECT uid FROM sess LIMIT 1')[0].uid;
  return { lab, DB: lab.env.DB, ...C, su, close: () => lab.close() };
}

/* صورةُ PNG حقيقية (ضجيجٌ لا ينضغط) طولُ نصّها base64 ≈ chars */
export function png(chars, seed = 1) {
  const bytes = Math.max(64, Math.floor(chars * 0.75) - 100), w = Math.max(2, Math.floor(Math.sqrt(bytes / 3))), h = Math.max(2, Math.floor(bytes / (3 * w + 1)));
  const raw = Buffer.alloc(h * (3 * w + 1));
  const noise = crypto.createCipheriv('aes-128-ctr', crypto.createHash('md5').update('TEST_ONLY ' + seed).digest(), Buffer.alloc(16)).update(Buffer.alloc(raw.length));
  noise.copy(raw);
  for (let y = 0; y < h; y++) raw[y * (3 * w + 1)] = 0;   /* مرشّحُ السطر: بلا */
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const file = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 0 })), chunk('IEND', Buffer.alloc(0))]);
  return 'data:image/png;base64,' + file.toString('base64');
}
export function jpeg(chars, seed = 1) {
  const body = crypto.createCipheriv('aes-128-ctr', crypto.createHash('md5').update('TEST_ONLY jpeg ' + seed).digest(), Buffer.alloc(16)).update(Buffer.alloc(Math.floor(chars * 0.75)));
  body[0] = 0xff; body[1] = 0xd8; body[2] = 0xff;
  return 'data:image/jpeg;base64,' + body.toString('base64');
}

let docsCache = null;
export async function legacyDocs() {
  if (docsCache) return JSON.parse(docsCache);
  const lab = await startLab();
  lab.env.KIVO_TEST_FIXTURE = 'allow'; lab.env.KIVO_TEST_HOST = 'lab.local';
  try {
    const C = client(lab), su = await C.login(LAB.superUn, LAB.superPw), uid = lab.env.DB.q('SELECT uid FROM sess LIMIT 1')[0].uid;
    const seed = await C.call('/api/demo-data', { ck: su.ck, body: { act: 'seed' } });
    assert.equal(seed.status, 200, 'demo seed ' + seed.t.slice(0, 200));
    const src = 'tst_demo_d1', ex = await C.call('/api/operations/export?uid=' + encodeURIComponent(uid) + '&dept=' + src, { ck: su.ck });
    assert.equal(ex.status, 200);
    const rd = await C.call('/api/operations/read?keys=' + encodeURIComponent(ex.j.domains.map((d) => 'bsdept:' + src + ':' + d.resource).join(',')), { ck: su.ck });
    assert.equal(rd.status, 200);
    const docs = {};
    for (const [k, v] of Object.entries(rd.j.resources)) if (v != null) docs[k.split(':').pop()] = v;
    docsCache = JSON.stringify(docs);
    return JSON.parse(docsCache);
  } finally { await lab.close(); }
}

const pad2 = (n) => String(n);
const pathD = (chars, salt) => { let d = 'M0 0'; for (let i = 0; d.length < chars; i++) d += ' L' + ((i * 7 + salt) % 997) + ' ' + ((i * 13 + salt * 3) % 991); return d + ' Z'; };
/* المفاتيحُ التي لا مقابلَ لها في الكود الحالي كما في الملف المقيس — وسببُ كلٍّ منها (019g rsiSkipWhy) */
export const NOT_TRANSFERRED = {
  bassam_dr_grp_v1: 'null', bassam_perm_tpls_v1: 'tpls', bassam_grants_v1: 'grants',
  'bassam_notif_dev_v1:TEST_ONLY_u1': 'null', 'bassam_notif_dev_v1:TEST_ONLY_u2': 'null', 'bassam_notif_dev_v1:TEST_ONLY_u3': 'null', 'bassam_notif_dev_v1:TEST_ONLY_u4': 'null',
  'bassam_notif_dev_v1:TEST_ONLY_u5': 'null', 'bassam_notif_dev_v1:TEST_ONLY_u6': 'null', 'bassam_notif_dev_v1:TEST_ONLY_u7': 'null', 'bassam_notif_dev_v1:TEST_ONLY_u8': 'device',
};
export async function oldFile({ scale = 1, small = false, images = true, planRows = 1 } = {}) {
  const docs = await legacyDocs(), J = JSON.stringify;
  const nImg = small ? 2 : 10 * scale, days = small ? 3 : 26 * scale, dayChars = small ? 6000 : 318000, planChars = small ? 9000 : 1150000, nfChars = small ? 3000 : 228000;
  const sizes = [1.48, 1.65, 1.85, 2.05, 2.25, 2.45, 2.7, 3.0, 3.37].map((m) => Math.round(m * 1e6));
  const ids = Array.from({ length: nImg }, (_, i) => 'img_testonly' + i + '_d6' + (small ? 's' : scale));
  const idb = {};
  if (images) ids.forEach((id, i) => { idb[id] = small ? png(1400, i) : i % 10 === 9 ? jpeg(490000, i) : png(sizes[i % 10], i); });
  /* المخطط: طابقٌ لكل صورة (iid) بمصلياته — نصُّ مسار المصلى يملأ الحجم المقيس */
  const baseFloor = docs.bassam_plan_v1.floors[0], perFloor = Math.floor(planChars / nImg), zonesPer = small ? 3 : 12 * planRows;   /* planRows: مضاعِفُ صفوف المخطط بالحجم نفسِه */
  /* V7 · د6 (schemafix): المصلى كما يكتبه Production — «مسحُ السعة» في المخطط يترك share · shareName = null، وسحبُ المصلى في الجولات يكتب نسخةَ العرض
     (nNow · capNow) — كلُّها فارغة في الملف المقيس؛ ومصلى واحد بقيمةٍ حقيقية (shareName هنا · nNow/capNow في الجولات) لا يُسقط بصمت بل يُذكر */
  const floors = ids.map((id, f) => ({ ...baseFloor, sid: 'tstd6s' + f, name: 'TEST_ONLY · طابق د6 ' + (f + 1), num: f + 1, iid: id, imgW: 1200, imgH: 900,
    zones: Array.from({ length: zonesPer }, (_, z) => ({ uid: 'tstd6z' + f + 'x' + z, code: 'D6Z' + f + '-' + z, name: 'TEST_ONLY · مصلى د6 ' + (f + 1) + '-' + (z + 1), d: pathD(Math.floor(perFloor / zonesPer) - 200, f * 31 + z), cx: 5 + z, cy: 5 + f, area: 100 + z, emp: z ? [] : ['tst_demo_e11'],
      share: null, shareName: f || z ? null : 'TEST_ONLY حصة قديمة', cap: null, count: null, nNow: null, capNow: 0 })),
    gates: baseFloor.gates.map((g, i) => ({ ...g, uid: 'tstd6g' + f + 'x' + i })), marks: baseFloor.marks.map((m, i) => ({ ...m, uid: 'tstd6m' + f + 'x' + i })), paths: baseFloor.paths.map((p, i) => ({ ...p, uid: 'tstd6p' + f + 'x' + i })) }));
  /* خطةُ الشهر الجاري في بيانات العرض تحمل طوابقَ النسخة — فتعرضها صفحةُ المخطط */
  const month = Object.keys(docs.bassam_plan_v1.months)[0];
  const plan = { ...docs.bassam_plan_v1, floors, months: { [month]: { ...docs.bassam_plan_v1.months[month], d: small ? floors : floors.slice(0, 1) } } };
  /* الجولات: يومٌ = لقطةُ طوابق — 26 يوماً ≈ 8.4MB */
  const firstDay = Object.keys(docs.bassam_rounds_v1)[0], baseDay = docs.bassam_rounds_v1[firstDay], rounds = {}, dz = small ? 2 : 40;
  for (let n = 0; n < days; n++) {
    const key = '1448-' + pad2(1 + Math.floor(n / 29)) + '-' + pad2(1 + (n % 29));
    rounds[key] = { ...baseDay, t: 1795000000000 + n * 86400000, d: [0, 1].map((f) => ({ ...floors[f % floors.length], iid: undefined, imgW: undefined, imgH: undefined,
      zones: Array.from({ length: dz }, (_, z) => ({ uid: 'tstd6r' + f + 'x' + z, code: 'D6R' + f + '-' + z, name: 'TEST_ONLY · مصلى جولة ' + (z + 1), d: pathD(Math.floor(dayChars / (2 * dz)) - 200, n * 17 + f * 5 + z), cx: z, cy: f, area: 50 + z, emp: [], fst: z % 3 ? 'open' : 'closed', fAt: 1795000000000 + n * 86400000 + z,
        /* V7 · د6 (schemafix): «القراءة بالسعة» كما يكتبها Production: {n, cap} · {n: null, cap: 0, p} حين لا سعة · رقمٌ قديم (count المنقول إلى fajr) */
        cap: 3000 + z, pc: [{ fajr: { n: 1000 + n + z, cap: 3000 + z } }, { fajr: 35, dhuhr: { n: null, cap: 0, p: 40 + z } }, { asr: { n: 0, cap: 3000 + z }, isha: null }, {}][(n + z) % 4],
        count: z % 2 ? null : 35, nNow: n || f || z ? null : 1000 + z, capNow: n || f || z ? 0 : 3000 + z })) })),
      /* سطرُ التقرير اليومي في سجلّ التسكين (rm · src) كما يكتبه Production */
      mvLog: [{ t: '07:00', kind: 'gates', key: 'tst_demo_e11', tok: 'tst_demo_e11', fromI: -1, toI: 0, rm: !!(n % 2), fromLbl: n % 2 ? 'TEST_ONLY موقع' : '', toLbl: n % 2 ? '' : 'TEST_ONLY موقع', by: 'TEST_ONLY', name: 'TEST_ONLY', src: 'dr' }] };
  }
  /* ما يُسقطه الاستيراد من حقول الموارد (019g rsiFields) — بعدده المتوقَّع، حسبما وُلِّد أعلاه */
  const pz = floors.length * zonesPer, mz = (small ? floors.length : 1) * zonesPer, rz = days * 2 * dz;
  const drops = {
    'bassam_plan_v1 · floors[].zones[].nNow|transient': pz, 'bassam_plan_v1 · floors[].zones[].capNow|transient': pz, 'bassam_plan_v1 · floors[].zones[].share|transient': pz,
    'bassam_plan_v1 · floors[].zones[].shareName|transient': pz - 1, 'bassam_plan_v1 · floors[].zones[].shareName|field': 1,
    'bassam_plan_v1 · months.{}.d[].zones[].nNow|transient': mz, 'bassam_plan_v1 · months.{}.d[].zones[].capNow|transient': mz, 'bassam_plan_v1 · months.{}.d[].zones[].share|transient': mz,
    'bassam_plan_v1 · months.{}.d[].zones[].shareName|transient': mz - 1, 'bassam_plan_v1 · months.{}.d[].zones[].shareName|field': 1,
    'bassam_rounds_v1 · {}.d[].zones[].nNow|transient': rz - 1, 'bassam_rounds_v1 · {}.d[].zones[].nNow|field': 1,
    'bassam_rounds_v1 · {}.d[].zones[].capNow|transient': rz - 1, 'bassam_rounds_v1 · {}.d[].zones[].capNow|field': 1,
  };
  /* V7 · د6 (remap): التنبيهُ كما يكتبه Production (441 emit · tkNotify): dept = معرّفُ إدارة المصدر (غيرُ معرّف الوحدة الهدف — الحالةُ الطبيعية) ·
     by = رمزُ الكاتب (مديرُ الإدارة «mgr:<المصدر>») · وأنواعٌ تصل لمستخدمي الوحدة: bc_dept للجميع · task_new لموظفٍ باسمه · emp_add لمدير الوحدة ودوره.
     ومنها ما لا يُنقل بنداً بنداً: pm_tpl (فئة perm — قوالبُ الصلاحيات حُذفت) ×4 · وتنبيهٌ لإدارةٍ أخرى (OTHER) ×1 — وعلاماتُ قراءةٍ لهما وللتعميم العام (bc:) */
  const KIND = [['bc_dept', 'bc', { e: [], r: ['all'] }], ['task_new', 'task', { e: ['tst_demo_e11'], r: [] }], ['emp_add', 'emp', { e: ['mgr:' + SRC_DEPT], r: ['mgr'] }]];
  const item = (i) => { const [type, k, to] = i >= 1 && i <= 4 ? ['pm_tpl', 'perm', { e: [], r: ['mgr'] }] : KIND[i % 3];
    return { id: 'TEST_ONLY_n' + i, type, k, lvl: 'info', chan: 'bell', t: 'TEST_ONLY · تنبيه د6 ' + i, b: 'TEST_ONLY · ' + 'نصُّ تنبيهٍ تجريبي '.repeat(small ? 4 : 56), at: 1795000000000 + i, by: 'mgr:' + SRC_DEPT, byName: 'TEST_ONLY مدير المصدر', to: JSON.parse(J(to)), go: '', dept: i === 5 ? OTHER_DEPT : SRC_DEPT }; };
  const nItems = Math.max(8, Math.floor(nfChars / J(item(0)).length)), items = Array.from({ length: nItems }, (_, i) => item(i));
  const nfDoc = { v: 1, items, read: { ['mgr:' + SRC_DEPT]: { TEST_ONLY_n0: 1795000001000, TEST_ONLY_n1: 1795000001000, 'bc:TEST_ONLY_bc1': 1795000001000 } }, ack: {}, del: {}, seen: { 'quota:TEST_ONLY': 1795000000500 } };
  /* المهام كما يكتبها العامل (071 tkWho): x.by و x.rv يحملان مفتاحَ مدير الإدارة المصدر */
  const tasks = Object.fromEntries(Object.entries(docs.bassam_tasks_v1).map(([day, rows]) => [day, rows.map((r) => { const x = r.slice(); while (x.length < 23) x.push(null);
    x[23] = { v: 2, by: { u: 'TEST_ONLY_mgr_src', e: 'mgr:' + SRC_DEPT, n: 'TEST_ONLY مدير المصدر' }, pol: { m: 'any', n: 1, steps: [] }, rv: { u: 'TEST_ONLY_mgr_src', e: 'mgr:' + SRC_DEPT, n: 'TEST_ONLY مدير المصدر' }, dec: 1 }; return x; })]));
  const nTaskRows = Object.values(tasks).reduce((n, rows) => n + rows.length, 0);
  const data = {
    bassam_rounds_v1: J(rounds), bassam_plan_v1: J(plan),
    bassam_notif_v1: J(nfDoc),
    bassam_dreport_v1: J(docs.bassam_dreport_v1), bassam_tasks_v1: J(tasks),
    bassam_grants_v1: J({ v: 1, emp: { tst_demo_e11: { plus: ['plan.edit'], minus: [] } } }), bassam_zone_opts_v1: J({}),
    bassam_staffing_v3: J(docs.bassam_staffing_v3), bassam_perm_tpls_v1: J([{ id: 'TEST_ONLY_t1', name: 'TEST_ONLY قالب 1' }, { id: 'TEST_ONLY_t2', name: 'TEST_ONLY قالب 2' }, { id: 'TEST_ONLY_t3', name: 'TEST_ONLY قالب 3' }]),
    bassam_employees_v1: J(docs.bassam_employees_v1), bassam_dayshift_v1: J({}), bassam_custody_v1: J({ items: [], moves: [] }),
    bassam_shift_options_v1: J(docs.bassam_shift_options_v1), bassam_gate_opts_v1: J({}), bassam_options_v1: J(docs.bassam_options_v1),
    bassam_staffing_locks_v1: J({}), bassam_dayfocus_v1: J({}), bassam_tasks_locks_v1: '{}',
    bassam_first_boot_v1: '1795000000001', bassam_last_export_v1: '1795000000002', bassam_dr_grp_v1: null,
  };
  for (let u = 1; u <= 8; u++) data['bassam_notif_dev_v1:TEST_ONLY_u' + u] = u === 8 ? '1795000000003' : null;
  const file = { app: 'bassam-crowd', version: 3, kind: 'dept', dept: 'TEST_ONLY إدارة قديمة', exportedAt: '2026-11-20T10:00:00.000Z', data,
    perms: { capSet: true, cap: ['plan', 'daily', 'emps', 'admin'], emps: { tst_demo_e11: { plan: ['view'] }, ['mgr:' + SRC_DEPT]: { plan: ['view'] } }, lenses: [] }, idbImages: idb, preImport: false };
  DROPS.set(file, drops);
  /* ما يُعاد ربطه (019f rsBCDeptWalk) بعدده: لكل تنبيهٍ dept (إلا OTHER) و by وما في to.e من مفتاح المدير · علامةُ القراءة (رمزُ المدير) · لكل مهمةٍ by و rv · صحيفةُ المدير */
  const nfRefs = items.reduce((n, x) => n + (x.dept === SRC_DEPT ? 1 : 0) + 1 + x.to.e.filter((e) => e === 'mgr:' + SRC_DEPT).length, 0) + 1;
  REMAP.set(file, { from: SRC_DEPT, n: nfRefs + 2 * nTaskRows + 1, by: { notifications: nfRefs, tasks: 2 * nTaskRows, perms: 1 }, foreign: { [OTHER_DEPT]: 1 },
    /* ما يُسقطه تحويلُ التنبيهات بنداً بنداً: { 'bassam_notif_v1 · <النوع>|<السبب>': العدد } */
    nfDrops: { 'bassam_notif_v1 · pm_tpl|nf-type': 4, ['bassam_notif_v1 · ' + items[5].type + '|nf-department']: 1, 'bassam_notif_v1 · read|nf-state-message-unknown': 2 },
    kept: items.filter((x) => x.type !== 'pm_tpl' && x.dept === SRC_DEPT).map((x) => x.id) });
  return file;
}
/* V7 · د6 (schemafix): حقولُ المصلى التي لا يعرفها المخطّط في الملف القديم — يُسقطها الاستيرادُ ويذكرها؛ المطابقةُ مفتاحاً مفتاحاً تكون على الوثيقة بدونها */
export const DROPPED_FIELDS = ['nNow', 'capNow', 'share', 'shareName'];
const DROPS = new WeakMap(), REMAP = new WeakMap();
/* V7 · د6 (remap): معرّفُ إدارة المصدر في الملف القديم (كما في Production: معرّفٌ لا يوجد على المنصة الهدف) · ومعرّفٌ أجنبي في تنبيهٍ واحد */
export const SRC_DEPT = 'TEST_ONLY_srcdept9x', OTHER_DEPT = 'TEST_ONLY_otherdept';
/* المتوقَّع من إعادة الربط: { from, n, by, foreign, nfDrops, kept (معرّفاتُ التنبيهات التي تُنقل) } */
export const remapOf = (file) => REMAP.get(file);
export function nfDropsOf(list) {
  const out = {};
  for (const x of list || []) if (/^nf-/.test(x.why)) out[x.k + '|' + x.why] = (out[x.k + '|' + x.why] || 0) + x.n;
  return out;
}
/* ما لن يُنقل من الحقول كما يُتوقَّع في summary.notTransferred: { 'المورد · المسار.الحقل|السبب': العدد } (أرشيفُ الجولات يُجمع مع الجولات) */
export const fieldDrops = (file) => ({ ...DROPS.get(file) });
export function fieldDropsOf(list) {
  const out = {};
  for (const x of list || []) if (['transient', 'field', 'field-type'].includes(x.why)) { const k = x.k.replace(/^bassam_rounds_arc_v1 /, 'bassam_rounds_v1 ') + '|' + x.why; out[k] = (out[k] || 0) + x.n; }
  return out;
}
export function withoutDropped(value) {
  if (Array.isArray(value)) return value.map(withoutDropped);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([k]) => !DROPPED_FIELDS.includes(k)).map(([k, v]) => [k, withoutDropped(v)]));
}
export const sizeOf = (file) => { const d = Object.values(file.data).reduce((n, v) => n + (v ? Buffer.byteLength(v) : 4), 0), i = Object.values(file.idbImages || {}).reduce((n, v) => n + v.length, 0); return { data: d, images: i, total: d + i, maxKey: Math.max(...Object.values(file.data).map((v) => (v ? Buffer.byteLength(v) : 0))), maxImage: Math.max(0, ...Object.values(file.idbImages || {}).map((v) => v.length)) }; };

/* تقطيعٌ لا يشقّ زوجاً بديلاً — كما يفعل العميل (548) */
export function cut(text, size) {
  const out = [];
  for (let at = 0; at < text.length;) { let end = Math.min(text.length, at + size); if (end < text.length && (text.charCodeAt(end - 1) & 0xfc00) === 0xd800) end--; out.push(text.slice(at, end)); at = end; }
  return out;
}
/* تقسيمُ المفتاح الكبير دفعاتٍ — كما يفعل العميل (548 split): الأعضاءُ المشتركة + مجموعةُ أيام ≤ ~0.7M حرف */
export function sliceKey(raw, rxSource, target = 700000) {
  const doc = JSON.parse(raw), rx = new RegExp(rxSource), shared = {}, days = [], texts = [];
  for (const k of Object.keys(doc)) { if (rx.test(k)) days.push(k); else shared[k] = doc[k]; }
  const head = JSON.stringify(shared).length;
  let group = { ...shared }, size = head;
  for (const d of days) { const one = JSON.stringify(doc[d]).length + d.length + 4; if (size + one > target && size > head) { texts.push(JSON.stringify(group)); group = { ...shared }; size = head; } group[d] = doc[d]; size += one; }
  texts.push(JSON.stringify(group));
  return texts;
}
let rid = 0;
/* slice: 'auto' (كالعميل: ما يعلنه الخادم وكان أكبر من حدّه) · false (مسارٌ واحد) · رقم (حدٌّ أدنى مفروض وحجمُ دفعةٍ صغير — للمقارنة على بياناتٍ صغيرة) */
export function protocol(T, who, file, { scope, mode = 'replace', reason = 'TEST_ONLY د6', requestId, slice = 'auto', sliceTarget } = {}) {
  const id = requestId || 'TEST_ONLY_d6_' + (++rid) + '_' + crypto.randomBytes(6).toString('hex');
  const { idbImages = {}, ...rest0 } = file;
  const post = (body) => T.call('/api/backup/import', { ck: who.ck, body: { requestId: id, ...body } });
  const keys = rest0.manifest ? undefined : Object.fromEntries(Object.entries(rest0.data || {}).map(([k, v]) => [k, v === null ? 1 : 0]));
  const P = {
    id, parts: [], post, slices: {}, sliceCount: 0, text: '',
    /* يُبنى مرةً قبل البدء: ما يُقسم يخرج من نصّ الملف */
    async build() {
      if (P.parts.length) return;
      const rest = { ...rest0, data: { ...(rest0.data || {}) } }, sl = [];
      if (slice !== false && keys) {
        const dry = await post({ op: 'begin', dry: true, scope, keys, mode });
        const spec = (dry.j && dry.j.slice) || {}, min = typeof slice === 'number' ? slice : (dry.j && dry.j.sliceMin) || Infinity;
        for (const name of Object.keys(spec)) {
          const raw = rest.data[name];
          /* موردٌ لا ينقسم بأعضائه (النمط null): كلُّه دفعةً واحدة في طلبه — دائماً */
          if (!spec[name][0]) { if (typeof raw === 'string' && raw.length > 2) { delete rest.data[name]; P.slices[name + '#0'] = raw.length; cut(raw, SEG.f).forEach((t, n) => sl.push({ k: '#' + name + '#0', s: n, t })); } continue; }
          if (typeof raw !== 'string' || raw.length < min) continue;
          const texts = sliceKey(raw, spec[name][0], sliceTarget);
          if (texts.length < 2) continue;
          delete rest.data[name];
          texts.forEach((t, n) => { P.slices[name + '#' + n] = t.length; sl.push({ k: '#' + name + '#' + n, s: 0, t }); });
        }
      }
      P.text = JSON.stringify(rest); P.fparts = cut(P.text, SEG.f); P.sliceCount = Object.keys(P.slices).length;
      P.parts = P.fparts.map((t, s) => ({ k: '', s, t })).concat(sl, Object.entries(idbImages).flatMap(([k, v]) => cut(v, SEG.i).map((t, s) => ({ k, s, t }))));
    },
    begin: async (extra = {}) => { await P.build(); return post({ op: 'begin', scope, n: P.text.length, f: P.fparts.length, images: Object.fromEntries(Object.entries(idbImages).map(([k, v]) => [k, v.length])), slices: P.slices, mode, ...(keys ? { keys } : {}), ...extra }); },
    part: (i) => post({ op: 'part', items: [P.parts[i]] }),
    sliceStep: (i) => post({ phase: 'slice', i, reason }),
    inventory: async () => { const q = new URLSearchParams({ kind: scope.kind, departments: '[]' }); if (scope.kind === 'dept') q.set('dept', scope.departmentId); return (await T.call('/api/backup/restore?' + q, { ck: who.ck })).j; },
    inspect: async () => { const inv = await P.inventory(); return post({ phase: 'inspect', scope, mode, reason, base: inv && inv.base, legacyConsent: false }); },
    commit: (base, extra = {}) => post({ phase: 'commit', scope, mode, reason, base, legacyConsent: true, ...extra }),
    cancel: () => post({ op: 'cancel' }),
    /* المسارُ كلُّه: ⇒ { begin, inspect, commit } (يتوقّف عند أول رفض) */
    async run({ onPart } = {}) {
      const out = { begin: await P.begin() };
      if (out.begin.status !== 200) return out;
      for (let i = 0; i < P.parts.length; i++) { const r = await P.part(i); if (onPart) await onPart(i, r); if (r.status !== 200) { out.part = r; out.failedAt = i; return out; } }
      for (let i = 0; i < P.sliceCount; i++) { const r = await P.sliceStep(i); if (r.status !== 200) { out.slice = r; out.inspect = r; out.failedAt = i; return out; } }
      out.inspect = await P.inspect();
      if (out.inspect.status !== 200) return out;
      out.commit = await P.commit(out.inspect.j.inspection.base);
      return out;
    },
  };
  return P;
}
export const staged = (DB) => DB.q("SELECT COUNT(*) n FROM restore_preimage WHERE snapshot_id>='stage:' AND snapshot_id<'stage;'")[0].n;
/* لقطةُ كلِّ ما قد يغيّره الاستيراد — للمقارنة «لم يتغيّر شيء». خارجها: السجلاتُ والجلسات، والمؤقتُ نفسُه (يُفحص بـ staged)، وما تكتبه الصفحةُ المفتوحة
   من تلقاء نفسها ولا علاقة له بالاستيراد (نقاطُ فحص التنبيهات وعدّادُها · طابعُ rev العام · حرّاسُ المهام tkg:) */
export function snapshot(DB) {
  const skip = new Set(['aud', 'audit', 'sec', 'authz', 'authz_snap', 'authz_snaps', 'sess', 'guard', 'sqlite_sequence', 'restore_preimage', 'restore_snapshot_manifest', 'd1_migrations', 'notification_checkpoints']), out = {};
  const where = { meta: " WHERE k IN ('restore_epoch','schema_version','authz_mode')", revs: " WHERE k NOT GLOB 'bassam_notif*'" };
  for (const { name } of DB.q("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")) {
    if (skip.has(name)) continue;
    const h = crypto.createHash('sha256'); let n = 0;
    for (const r of DB.q('SELECT * FROM ' + name + (where[name] || '')).map((r) => JSON.stringify(Object.values(r))).sort()) { h.update(r + '\n'); n++; }
    out[name] = n + ':' + h.digest('hex').slice(0, 16);
  }
  return out;
}
export const changed = (a, b) => Object.keys({ ...a, ...b }).filter((t) => a[t] !== b[t]);
export const readOps = async (T, who, dept, names) => { const r = await T.call('/api/operations/read?keys=' + encodeURIComponent(names.map((n) => 'bsdept:' + dept + ':' + n).join(',')), { ck: who.ck }); assert.equal(r.status, 200, r.t.slice(0, 200)); return Object.fromEntries(Object.entries(r.j.resources).map(([k, v]) => [k.split(':').pop(), v])); };
export const readImage = async (T, who, id) => T.call('/api/img/' + id, { ck: who.ck });
