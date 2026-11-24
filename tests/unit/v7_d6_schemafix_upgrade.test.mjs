/* V7 · د6 (schemafix · قرار المالك: الترحيل 0012 معتمد) — ترقيةُ قاعدةٍ حقيقية من الإصدار 10 إلى 12 بالعامل الجديد.
   القاعدةُ يبنيها العاملُ القديم نفسُه (workers/_worker.js عند 0113db33 — الإصدار 10، شكلُ بيانات عهد Production/Preview) بطرق كتابته الحقيقية
   (/api/save · أوامرُ المهام) على قاعدةٍ فارغة: المخطط · الجولات وأرشيفُها (pc أرقام · نصوص · null · خريطةٌ فارغة · pc: null) · سطورُ التسكين ·
   والموارد التشغيلية الأخرى. ثم يبدأ العاملُ الجديد عليها بتصريح المشغّل (meta.schema_upgrade_permit_v1 كما في دليل الترحيلات):
   أولُ طلب يرقّيها 10 ← 11 ← 12، وبعدها (أ) كلُّ قيمةٍ تُقرأ كما كُتبت حرفاً (القراءةُ المرمَّزة · وتصديرُ الإدارة مفكوكاً مفتاحاً مفتاحاً)
   و(ب) الحفظُ الحيّ يعمل عبر /api/save — قراءةٌ بالسعة {n, cap} من منطق صفحة الجولات، و«مسحُ السعة» من منطق صفحة المخطط — ويعود كما كُتب.
   يحتاج تاريخ git (git show 0113db33:workers/_worker.js — للقراءة فقط، إلى مجلدٍ مؤقت) كما caps_own_stale؛ بغيابه يُتخطّى. KIVO_UPGRADE_REV يبدّل المرجع.
   بياناتٌ اصطناعية TEST_ONLY فقط. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { D1Shim, ROOT, WORKER, CURRENT_SCHEMA, allowTestSchemaUpgrade, hasSystem } from './harness.mjs';
import { world as canvas } from './canvas_world.mjs';

const OLD_REV = process.env.KIVO_UPGRADE_REV || '0113db33';
const D = 'TEST_ONLY_upgrade_dept', G = 'TEST_ONLY_upgrade_group', SUPER = 'TEST_ONLY_upgrade_super', TOK = 'TEST_ONLY_upgrade_session';
const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'workers/parts.json'), 'utf8')).parts;
let oldSource = null, why = '';
try { oldSource = execFileSync('git', ['-C', ROOT, 'show', OLD_REV + ':workers/_worker.js'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }); }
catch (e) { why = 'يحتاج تاريخ git للمرجع ' + OLD_REV; }
const need = !oldSource ? { skip: why } : hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport') ? {} : { skip: 'يحتاج أنظمة المخطط والجولات والمهام والتشغيل والتقرير' };

let inst = 0;
async function oldWorker() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_upgrade_')), file = path.join(dir, 'worker-' + OLD_REV + '.mjs');
  fs.writeFileSync(file, oldSource);
  try { return (await import(pathToFileURL(file).href + '?inst=' + ++inst)).default; } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const newWorker = async () => (await import(pathToFileURL(WORKER).href + '?upgrade=' + ++inst)).default;
/* أدواتُ العامل الجديد بأسمائها (لفكّ تصدير الإدارة) — من أجزائه كما في v7_d6_schemafix_migration */
async function internals() {
  const source = parts.map((p) => fs.readFileSync(path.join(ROOT, 'workers/parts', p.file), 'utf8')).join('');
  return import('data:text/javascript;base64,' + Buffer.from(source + '\nexport { opBackupDecode, ocInflate };\n// upgrade internals ' + ++inst).toString('base64'));
}
function env() {
  const DB = new D1Shim();
  return { DB, KIVO_AUTHZ_MODE: 'enforce', ASSETS: { fetch: async () => new Response('<!doctype html><html><head><!--BS_BOOT--></head><body>TEST_ONLY</body></html>', { headers: { 'Content-Type': 'text/html' } }) } };
}
function api(W, E) {
  return async (route, { method = 'GET', body } = {}) => {
    const headers = new Headers({ Cookie: 'bs_tok=' + TOK });
    if (method !== 'GET') { headers.set('Origin', 'http://x'); headers.set('Content-Type', 'application/json'); }
    const r = await W.fetch(new Request('http://x' + route, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), E);
    let json = null; try { json = await r.json(); } catch (e) { /* ليس JSON */ }
    return { status: r.status, json };
  };
}
const key = (r) => 'bsdept:' + D + ':' + r;
async function read(call, resources) {
  const r = await call('/api/operations/read?' + new URLSearchParams({ uid: SUPER, keys: resources.map(key).join(',') }));
  assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.json.ok, 1);
  return r;
}
async function save(call, set, requestId) {
  const r0 = await read(call, Object.keys(set));
  return call('/api/save', { method: 'POST', body: { uid: SUPER, requestId, epoch: r0.json.epoch, base: r0.json.base, set: Object.fromEntries(Object.entries(set).map(([k, v]) => [key(k), JSON.stringify(v)])), del: [] } });
}
const zone = (uid, n, pc) => ({ uid, code: String(n), d: 'M' + (100 + n * 120) + ' 100 L' + (200 + n * 120) + ' 100 L' + (200 + n * 120) + ' 300 Z', cx: 150 + n * 120, cy: 200, cap: 300, area: 120, count: n % 2 ? 35 : null, ...(pc === undefined ? {} : { pc }), emp: [] });
const PCS = [{ fajr: 35, dhuhr: '12' }, { asr: null }, {}, null, { isha: 0 }];

test('(١) قاعدةٌ بناها العاملُ القديم (الإصدار 10) يرقّيها العاملُ الجديد بالتصريح إلى 12: القيمُ كما هي · التصديرُ مفتاحاً مفتاحاً · الحفظُ الحيّ بالقراءة بالسعة ومسح السعة', { timeout: 300000, ...need }, async () => {
  const E = env(), OLD = await oldWorker(), call0 = api(OLD, E);
  /* ① قاعدةٌ فارغة: العاملُ القديم يطبّق ترحيلاته العشرة بنفسه */
  const ping0 = await call0('/api/ping');
  assert.equal(ping0.status, 200, JSON.stringify(ping0.json));
  assert.equal(E.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, '10');
  assert.equal(E.DB.q('SELECT COUNT(*) n FROM d1_migrations')[0].n, 10);
  /* الهويةُ والهيكل (KV في الإصدار 10 كما في Production) — حسابُ مدير المنصة وجلستُه */
  const kv = {
    bassam_auth_users_v1: [{ id: SUPER, un: '1000000999', name: 'TEST_ONLY مدير المنصة', role: 'super', ph: 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64), mc: 0, dis: 0 }],
    bassam_gdepts_v1: [{ id: G, name: 'TEST_ONLY إدارة عامة', kind: 'إدارة عامة' }],
    bassam_depts_v1: [{ id: D, name: 'TEST_ONLY إدارة الترقية', gid: G }],
    bassam_perms_v1: { caps: { [G]: ['plan', 'daily', 'dreport', 'tasks', 'staff', 'emps', 'admin'], [D]: ['plan', 'daily', 'dreport', 'tasks', 'staff', 'emps', 'admin'] }, emps: { [D]: {} } },
    bassam_platform_v1: {},
  };
  for (const [k, v] of Object.entries(kv)) { E.DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,0,?)').run(k, JSON.stringify(v)); E.DB.db.prepare('INSERT INTO revs(k,rev) VALUES(?,1)').run(k); }
  E.DB.exec("INSERT INTO meta(k,v) VALUES('rev','1') ON CONFLICT(k) DO UPDATE SET v='1'; INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  E.DB.db.prepare('INSERT INTO sess(tok,uid,ts,la,dev,city) VALUES(?,?,?,?,?,?)').run(TOK, SUPER, Date.now(), Date.now(), 'TEST_ONLY', 'TEST_ONLY');

  /* ② البياناتُ بطرق كتابة العامل القديم: يومُ اليوم (كما تحسبه صفحةُ الجولات) ويومٌ من شهرٍ منقضٍ (يُنقل إلى الأرشيف) */
  /* يومُ شهرٍ منقضٍ لا يُنشئه العاملُ القديم إلا في يومه (قفلُ الفترة) — فيُكتب بساعةٍ مُرجَعة 45 يوماً ثم تُعاد الساعة */
  const RealDate = Date, SHIFT = 45 * 864e5;
  const page = canvas().logic('daily'), h = page.hParts(new Date()), today = h.y + '-' + h.m + '-' + h.d, hp = page.hParts(new RealDate(RealDate.now() - SHIFT)), past = hp.y + '-' + hp.m + '-' + hp.d;
  assert.notEqual(hp.y + '-' + hp.m, h.y + '-' + h.m, 'اليومُ المُرجَع من شهرٍ سابق');
  const day = (n) => ({ t: 1 + n, d: [{ sid: 'TEST_ONLY_S1', name: 'TEST_ONLY موقع', zones: PCS.map((pc, i) => zone('TEST_ONLY_z' + n + '_' + i, i, pc)).concat([zone('TEST_ONLY_z' + n + '_np', 6)]), gates: [], marks: [], paths: [] }],
    mvLog: [{ t: '07:00', kind: 'gates', key: 'TEST_ONLY_e1', tok: 'TEST_ONLY_e1', fromI: -1, toI: 0, fromLbl: '', toLbl: 'TEST_ONLY', by: 'TEST_ONLY', name: 'TEST_ONLY' }] });
  const site = { sid: 'TEST_ONLY_S1', name: 'TEST_ONLY موقع', num: 1, mpu: 2, zones: PCS.map((pc, i) => zone('TEST_ONLY_p' + i, i, pc)), gates: [], marks: [], paths: [], sectors: [] };
  const docs = {
    bassam_plan_v1: { pMig: 3, zones: [], gates: [], marks: [], paths: [], floors: [site], months: { [h.y + '-' + h.m]: { c: 1, d: [JSON.parse(JSON.stringify(site))] } }, cfg: {}, delMonths: {} },
    bassam_rounds_v1: { [today]: day(0) },
    bassam_zone_opts_v1: { region: ['TEST_ONLY منطقة'], level: [], ztype: [], zcat: ['رجال'] },
    bassam_shift_options_v1: [{ name: 'TEST_ONLY الأولى', color: '#336699', tStart: '06:00', tEnd: '14:00' }],
    bassam_employees_v1: [{ eid: 'TEST_ONLY_e1', name: 'TEST_ONLY موظف', nid: '1000000998', empno: '7001' }],
    bassam_options_v1: { type: ['TEST_ONLY نوع'], work: ['TEST_ONLY عمل'] },
    bassam_gate_opts_v1: { loc: ['TEST_ONLY شمال'], gtype: [], kind: [], route: [], cls: [], cat: [] },
    bassam_staffing_v3: { [h.y + '-' + h.m]: { __shifts: ['TEST_ONLY الأولى'], TEST_ONLY_e1: { shift: 'TEST_ONLY الأولى', rest: ['الجمعة'], muk: false, cs: '' } } },
    bassam_dreport_v1: { [today]: { created: 1, roster: [{ ekey: 'TEST_ONLY_e1', name: 'TEST_ONLY موظف', empno: '7001', shift: 'TEST_ONLY الأولى', st: 'pr' }], leaders: {}, rest: {}, muk: {} } },
  };
  globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [RealDate.now() - SHIFT])); } static now() { return RealDate.now() - SHIFT; } };
  try {
    const s = await save(call0, { bassam_rounds_v1: { [past]: day(1) } }, 'TEST_ONLY_upgrade_old_past_day');
    assert.equal(s.status, 200, 'يومُ الشهر المنقضي في يومه: ' + JSON.stringify(s.json));
  } finally { globalThis.Date = RealDate; }
  docs.bassam_rounds_v1 = { ...(await read(call0, ['bassam_rounds_v1'])).json.resources[key('bassam_rounds_v1')], [today]: day(0) };
  for (const [r, v] of Object.entries(docs)) {
    const s = await save(call0, { [r]: v }, 'TEST_ONLY_upgrade_old_' + r);
    assert.equal(s.status, 200, r + ': ' + JSON.stringify(s.json)); assert.equal(s.json.ok, 1, r);
  }
  /* العاملُ عند 0113db33 بلا أرشيفٍ للجولات (bassam_rounds_arc_v1 أُضيف بعده): يومُ الشهر المنقضي في الجولات نفسِها */
  const ALL = ['bassam_plan_v1', 'bassam_rounds_v1', 'bassam_zone_opts_v1', 'bassam_gate_opts_v1', 'bassam_shift_options_v1', 'bassam_employees_v1', 'bassam_options_v1', 'bassam_staffing_v3', 'bassam_dreport_v1'];
  const before = (await read(call0, ALL)).json.resources;
  assert.ok(before[key('bassam_rounds_v1')][past], 'يومُ الشهر المنقضي محفوظ');
  assert.deepEqual(before[key('bassam_rounds_v1')][today].d[0].zones.map((z) => z.pc), PCS.concat([undefined]), 'العاملُ القديم خزّن كلَّ أشكال pc');
  const oldExport = await call0('/api/operations/export?' + new URLSearchParams({ uid: SUPER, dept: D }));
  assert.equal(oldExport.status, 200, JSON.stringify(oldExport.json).slice(0, 300));
  const legacyPc = E.DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE schema_id='ops_plan_deleted_months' AND member_key='pc'")[0].n;
  assert.ok(legacyPc >= 10, 'صفوفُ pc بالترميز القديم في القاعدة: ' + legacyPc);

  /* ③ العاملُ الجديد على القاعدة نفسِها: بلا تصريحٍ يرفض (503) ولا يكتب؛ بالتصريح يرقّي 10 ← 11 ← 12 في أول طلب */
  const NEW = await newWorker(), call = api(NEW, E);
  const refused = await call('/api/ping');
  assert.ok(refused.status >= 500, 'بلا تصريح لا ترقية: ' + refused.status);
  assert.equal(E.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, '10');
  const permit = JSON.parse(allowTestSchemaUpgrade(E.DB));
  /* V7 · 53: إلى المخطط الحالي (0013 التخزين بالفترة بعد 0012) — لا رقمَ مخطّطٍ حرفيّ للحالي */
  assert.deepEqual([permit.from, permit.to, permit.migrations.slice(0, 2)], [10, CURRENT_SCHEMA, ['0011_session_device', '0012_prayer_readings']]);
  const NEW2 = await newWorker(), call2 = api(NEW2, E), ping = await call2('/api/ping');
  assert.equal(ping.status, 200, JSON.stringify(ping.json));
  assert.equal(E.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(CURRENT_SCHEMA));
  assert.deepEqual(E.DB.q('SELECT name FROM d1_migrations ORDER BY id').map((r) => r.name).slice(10, 12), ['0011_session_device', '0012_prayer_readings']);
  assert.equal(E.DB.q("SELECT COUNT(*) n FROM meta WHERE k='schema_upgrade_permit_v1'")[0].n, 0, 'التصريحُ استُهلك');
  assert.equal(E.DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE schema_id='ops_plan_deleted_months' AND member_key='pc'")[0].n, 0, 'لا صفَّ pc بالترميز القديم');
  assert.deepEqual(E.DB.q('PRAGMA foreign_key_check'), []);

  /* (أ) كلُّ قيمةٍ كما كُتبت: القراءةُ المرمَّزة حرفاً · وتصديرُ الإدارة (الجديد · والقديم المصدَّر قبل الترقية) مفكوكاً مفتاحاً مفتاحاً */
  const after = (await read(call2, ALL)).json.resources;
  for (const r of ALL) assert.equal(JSON.stringify(after[key(r)]), JSON.stringify(before[key(r)]), r + ' كما كُتب قبل الترقية');
  const I = await internals(), newExport = await call2('/api/operations/export?' + new URLSearchParams({ uid: SUPER, dept: D }));
  assert.equal(newExport.status, 200, JSON.stringify(newExport.json).slice(0, 300));
  for (const [tag, ex] of [['الجديد', newExport.json], ['القديم (قبل الترقية)', oldExport.json]]) {
    const docsOf = Object.fromEntries(ex.domains.map((dom) => { const dec = I.opBackupDecode(dom), p = I.ocInflate(dec.info.prepared, dec.domain); return [dec.key, p.present ? JSON.stringify(p.value) : null]; }));
    for (const r of ALL) assert.equal(docsOf[key(r)], JSON.stringify(before[key(r)]), 'تصديرُ الإدارة ' + tag + ': ' + r);
  }

  /* V7 · 53: الكتابةُ التشغيلية بعد 0013 تنتظر المرحلةَ ٢ لهذه الإدارة (أمرُ مدير المنصة) — كما في دليل الترحيل */
  const m13 = await call2('/api/operations/periods-migrate', { method: 'POST', body: { dept: D } });
  assert.equal(m13.status, 200, JSON.stringify(m13.json)); assert.equal(m13.json.ok, 1, JSON.stringify(m13.json));
  /* (ب) الحفظُ الحيّ بعد الترقية — بطرق كتابة الصفحتين الحقيقية */
  const W1 = canvas(), daily = W1.logic('daily');
  W1.store.set('bassam_rounds_v1', JSON.stringify(after[key('bassam_rounds_v1')]));
  daily.state = Object.assign({}, daily.state, { year: h.y, month: h.m, day: h.d, floor: 0, lens: 'zones', tool: 'select', prayer: 'maghrib', dview: { x: 0, y: 0, w: 1000, h: 600 }, dsSel: { t: 'zone', i: 0 }, rounds: after[key('bassam_rounds_v1')] });
  daily.renderVals(); daily._occApply.n(240);
  const rounds = JSON.parse(W1.store.get('bassam_rounds_v1'));
  assert.deepEqual(rounds[today].d[0].zones[0].pc, { fajr: 35, dhuhr: '12', maghrib: { n: 240, cap: 300 } }, 'الصفحةُ تكتب القراءةَ بالسعة بجانب القيم القديمة');
  const s1 = await save(call2, { bassam_rounds_v1: rounds }, 'TEST_ONLY_upgrade_new_reading');
  assert.equal(s1.status, 200, JSON.stringify(s1.json)); assert.equal(s1.json.ok, 1);
  const W2 = canvas(), plan = W2.logic('plan'), P = after[key('bassam_plan_v1')], F = JSON.parse(JSON.stringify(P.floors)), month = h.y + '-' + h.m;
  W2.store.set('bassam_plan_v1', JSON.stringify(P));
  plan.state = Object.assign({}, plan.state, { year: h.y, month: h.m, floor: 0, floors: F, zones: F[0].zones.slice(), gates: [], marks: [], paths: [], planMonths: JSON.parse(JSON.stringify(P.months)), sel: null, selMulti: [], tool: 'select', lens: 'plan', clearAsk: { kind: 'cap' } });
  plan.renderVals().clearAskDo();
  await new Promise((go) => setTimeout(go, 0)); W2.flushTimers();
  const plan2 = JSON.parse(W2.store.get('bassam_plan_v1'));
  assert.ok(plan2.months[month].d[0].zones.every((z) => z.cap === null && !('share' in z) && !('shareName' in z)), 'مسحُ السعة من الصفحة');
  const s2 = await save(call2, { bassam_plan_v1: plan2 }, 'TEST_ONLY_upgrade_new_clear_cap');
  assert.equal(s2.status, 200, JSON.stringify(s2.json)); assert.equal(s2.json.ok, 1);
  const back = (await read(call2, ['bassam_rounds_v1', 'bassam_rounds_arc_v1', 'bassam_plan_v1'])).json.resources;
  /* العاملُ الجديد ينقل يومَ الشهر المنقضي إلى الأرشيف عند الحفظ — بقراءاته كما هي */
  assert.deepEqual(back[key('bassam_rounds_arc_v1')] && back[key('bassam_rounds_arc_v1')][past], rounds[past], 'الأرشيفُ يحمل اليومَ المنقضي بقراءاته (أرقام · نص · null · خريطة فارغة · pc: null)');
  const sorted = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
  assert.equal(sorted({ ...back[key('bassam_rounds_arc_v1')], ...back[key('bassam_rounds_v1')] }), sorted(rounds), 'الجولاتُ (مع أرشيفها) تعود كما حُفظت');
  assert.equal(JSON.stringify(back[key('bassam_plan_v1')]), JSON.stringify(plan2), 'المخططُ يعود كما حُفظ');
  assert.ok(E.DB.q('SELECT COUNT(*) n FROM ops_zone_prayer_capacity')[0].n >= 1, 'القراءةُ بالسعة في جدولها');
});
