/* V7 · 53 (port-sync · بند 3 · قرار المالك 24 نوفمبر) — تعديلُ اسم خيار المصلى أو رمزه يسري على كل ما يتبعه، ومنه المقفلُ والمعتمد والمنقضي،
   بأمرٍ خادميٍّ واحد معلن «plan.optRef» (/api/plan/opt-ref): الخادمُ يحسب التعديلَ بنفسه من القيمة المخزّنة (العميلُ يرسل الخيارَ وحده لا الوثائق)،
   ولا يمسّ إلا حقولَ الخيار بالمرجع (region · level · ztype · zcat · code للمصلى، ومراجعَ الخيارات في كتالوجها) — لا يُفتح قفلٌ ولا يُلغى اعتماد،
   ويُسجَّل في سجل النشاط باسم من عدّل. بيانات TEST_ONLY على العامل الحقيقي (node:sqlite).
   ① حفظٌ عاديّ (/api/save) يمسّ شهراً مقفلاً يبقى مرفوضاً (locked-period) — الأمرُ لا يفتح باباً عاماً
   ② الأمر: منطقةٌ تُسمّى وتحمل أدوارَها ورمزَها ⇒ الشهرُ المنقضي المقفل · الموقعُ المعتمد · الجولةُ المعتمدة · اليومُ المؤرشف — كلُّها بالاسم والرمز الجديدين،
      والأقفالُ والاعتماداتُ كما هي حرفاً، وما عدا حقول الخيار لم يتغيّر حرفاً · سجلُّ النشاط باسم المعدِّل
   ③ النوعُ يحمل فئاتِه وألوانَها · ④ حدود الأمر: مجهولُ النوع · اسمٌ مكرّر · خيارٌ غير موجود · قاعدةٌ متحرّكة · من لا يملك تعديلَ الخيارات */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from '../../../../tests/unit/harness.mjs';
import { installCurrentSchemaFixture } from '../../../../tests/unit/current_schema_fx.mjs';

const T = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach((p) => { if (p.type !== 'literal') o[p.type] = +p.value; }); return o; })();
const back = (n) => { let y = T.year, m = T.month - n; while (m < 1) { m += 12; y--; } return { y, m }; };
const P1 = back(1), P3 = back(3);
const MK = T.year + '-' + T.month, PMK = P1.y + '-' + P1.m, OMK = P3.y + '-' + P3.m;
const DAY = MK + '-' + T.day, PDAY = PMK + '-5', ODAY = OMK + '-7';
const D = 'tst_d1', K = (r) => 'bsdept:' + D + ':' + r;
const KP = K('bassam_plan_v1'), KO = K('bassam_zone_opts_v1'), KR = K('bassam_rounds_v1'), KA = K('bassam_rounds_arc_v1');
const RG = 'TEST_ONLY منطقة', RG2 = 'TEST_ONLY منطقة جديدة', LV = 'TEST_ONLY دور', TY = 'TEST_ONLY نوع', TY2 = 'TEST_ONLY نوع جديد', CT = 'TEST_ONLY فئة';
function seedSql() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_optref_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', T.year + '-' + T.month + '-' + T.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
async function world() {
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce' }), C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'admin');
  await applySql(env.DB, seedSql()); await installCurrentSchemaFixture(env);
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const dm = await C.login('0000000101', '70101'); assert.ok(dm.ok, 'dm1');
  const uid = (await C.api('/api/whoami', { cookie: su.ck })).j.uid, dmUid = (await C.api('/api/whoami', { cookie: dm.ck })).j.uid;
  return { env, C, su: su.ck, dm: dm.ck, uid, dmUid };
}
const read = async (W, keys, ck, uid) => (await W.C.api('/api/operations/read?' + new URLSearchParams({ uid: uid || W.uid, keys: keys.join(',') }), { cookie: ck || W.su })).j;
let RQ = 0;
async function save(W, set, ck, uid, why) {
  const cur = await read(W, Object.keys(set), ck, uid);
  return W.C.api('/api/save', { method: 'POST', cookie: ck || W.su, body: { uid: uid || W.uid, requestId: 'TEST_ONLY_optref_' + (++RQ), epoch: cur.epoch, set: Object.fromEntries(Object.entries(set).map(([k, v]) => [k, JSON.stringify(v)])), del: [], base: cur.base, why: why ? Object.fromEntries(Object.keys(set).map((k) => [k, why])) : undefined } });
}
async function put(W, set) { const r = await save(W, set, null, null, 'TEST_ONLY seed'); assert.ok(r.j && r.j.ok === 1 && !Object.keys(r.j.denied || {}).length, 'حفظ TEST_ONLY: ' + JSON.stringify(r.j).slice(0, 400)); }
const zone = (uid, ser, extra) => Object.assign({ uid, code: 'A-1-M-' + ser, ser, region: RG, level: LV, ztype: TY, zcat: CT, name: 'TEST_ONLY مصلى ' + uid, d: 'M0 0 L10 0 L10 10 Z', area: 100, emp: [] }, extra || {});
const floor = (sid, tag, extra) => Object.assign({ sid, name: 'TEST_ONLY موقع ' + tag, num: 1, zones: [zone('tstoz' + tag + 'a', '01'), zone('tstoz' + tag + 'b', '02', { region: 'TEST_ONLY أخرى', level: 'TEST_ONLY دور آخر', code: 'B-9-M-02' })], gates: [], marks: [], paths: [] }, extra || {});
const OPTS = { region: [{ n: RG, c: 'A' }, { n: 'TEST_ONLY أخرى', c: 'B' }], level: [{ n: LV, c: '1', r: RG }, { n: 'TEST_ONLY دور آخر', c: '9', r: 'TEST_ONLY أخرى' }], ztype: [{ n: TY, k: 'M', c: [CT] }], zcat: [{ n: CT, r: TY }], zcatStyle: { [TY + ' · ' + CT]: { f: '#ff0000' } } };
const PLAN = () => ({ floors: [floor('tstos1', 'cur', { approved: true })], zones: floor('tstos1', 'cur').zones, gates: [], marks: [], paths: [],
  months: { [MK]: { c: 1, d: [floor('tstos1', 'cur', { approved: true })] }, [PMK]: { c: 1, d: [floor('tstos1', 'prev')] } } });
const ROUNDS = () => ({ [DAY]: { t: 1, ap: 1, d: [floor('tstos1', 'day')] }, [PDAY]: { t: 1, ap: 0, d: [floor('tstos1', 'pday')] }, [ODAY]: { t: 1, ap: 1, d: [floor('tstos1', 'oday')] } });

const optRef = (W, body, ck, uid) => W.C.api('/api/plan/opt-ref', { method: 'POST', cookie: ck || W.dm, body: Object.assign({ uid: uid || W.dmUid, dept: D }, body) });
const zonesOf = (doc) => { const out = []; const walk = (v, k) => { if (Array.isArray(v)) v.forEach((x) => (k === 'zones' && x && typeof x === 'object' ? out.push(x) : walk(x, ''))); else if (v && typeof v === 'object') Object.keys(v).forEach((q) => walk(v[q], q)); }; walk(doc, ''); return out; };
const strip = (doc) => JSON.parse(JSON.stringify(doc, function (k, v) { return v && typeof v === 'object' && !Array.isArray(v) && 'uid' in v && 'd' in v ? Object.fromEntries(Object.entries(v).filter(([q]) => !['region', 'level', 'ztype', 'zcat', 'code'].includes(q))) : v; }));
const logical = (r) => Object.assign({}, r.resources[KA] || {}, r.resources[KR] || {});
async function seeded() {
  const W = await world();
  await put(W, { [KO]: OPTS, [KP]: PLAN(), [KR]: ROUNDS() });
  const r0 = await read(W, [KP, KO, KR, KA]);
  assert.ok(r0.resources[KA] && r0.resources[KA][ODAY], 'اليومُ المنقضي في الأرشيف (شهرٌ مقفل)');
  assert.ok(r0.resources[KR][DAY].ap === 1 && r0.resources[KP].months[MK].d[0].approved === true, 'جولةٌ معتمدة · موقعٌ معتمد');
  return { W, r0 };
}

test('① الحفظُ العاديّ على شهرٍ مقفل يبقى مرفوضاً — الأمرُ لا يفتح باباً عاماً', async () => {
  const { W, r0 } = await seeded();
  const p = JSON.parse(JSON.stringify(r0.resources[KP])); p.months[PMK].d[0].zones[0].region = RG2;
  const a = await save(W, { [KP]: p }, W.dm, W.dmUid);
  assert.equal(a.status, 403); assert.match(JSON.stringify(a.j.denied), /locked-period: past-month-without-mo/);
  const q = JSON.parse(JSON.stringify(r0.resources[KR])); q[DAY].d[0].zones[0].region = RG2;
  const b = await save(W, { [KR]: q }, W.dm, W.dmUid);
  assert.equal(b.status, 403); assert.match(JSON.stringify(b.j.denied), /locked-period: day-approved/);
  /* ولا يُمرَّر الرمزُ الداخلي من جسم الطلب */
  const c = await W.C.api('/api/save', { method: 'POST', cookie: W.dm, body: { uid: W.dmUid, requestId: 'TEST_ONLY_optref_x1', epoch: 0, set: { [KP]: JSON.stringify(p) }, del: [], base: { [KP]: r0.base[KP] }, __optRef: 1, optRef: 1 } });
  assert.notEqual(c.j && c.j.ok, 1, 'حقلٌ مجهول لا يفتح القفل: ' + JSON.stringify(c.j).slice(0, 200));
});

test('② المنطقةُ تُسمّى وتحمل أدوارَها ورمزَها: الشهرُ المقفل · الموقعُ المعتمد · الجولةُ المعتمدة · اليومُ المؤرشف — والأقفالُ كما هي · سجلُّ النشاط باسم المعدِّل', async () => {
  const { W, r0 } = await seeded();
  const res = await optRef(W, { kind: 'region', was: RG, name: RG2, code: 'N', base: r0.base[KO] });
  assert.equal(res.status, 200, JSON.stringify(res.j).slice(0, 600));
  assert.equal(res.j.ok, 1); assert.ok(res.j.zones.plan >= 4 && res.j.zones.rounds >= 3, JSON.stringify(res.j.zones));
  const r1 = await read(W, [KP, KO, KR, KA]);
  const O = r1.resources[KO], P = r1.resources[KP], L0 = logical(r0), L1 = logical(r1);
  assert.deepEqual(O.region[0], { n: RG2, c: 'N' }); assert.equal(O.level[0].r, RG2, 'الدورُ يتبع منطقتَه'); assert.deepEqual(O.region[1], OPTS.region[1]); assert.deepEqual(O.level[1], OPTS.level[1]);
  const mine = (doc) => zonesOf(doc).filter((z) => /a$/.test(z.uid)), other = (doc) => zonesOf(doc).filter((z) => /b$/.test(z.uid));
  for (const z of mine(P).concat(mine(L1))) { assert.equal(z.region, RG2, z.uid); assert.equal(z.code, 'N-1-M-' + z.ser, z.uid + ' رمزٌ جديد'); }
  for (const z of other(P).concat(other(L1))) { assert.equal(z.region, 'TEST_ONLY أخرى', z.uid); assert.equal(z.code, 'B-9-M-02', z.uid + ' لا يُمسّ'); }
  assert.ok(mine(P.months[PMK]).length && mine(L1[ODAY]).length && mine(L1[DAY]).length, 'شهرٌ منقضٍ · يومٌ مؤرشف · جولةٌ معتمدة');
  /* لا قفلَ فُتح ولا اعتمادَ أُلغي — وما عدا حقول الخيار حرفاً */
  assert.equal(P.months[MK].d[0].approved, true); assert.equal(P.floors[0].approved, true); assert.equal(P.months[PMK].mo, undefined);
  assert.equal(L1[DAY].ap, 1); assert.equal(L1[ODAY].ap, 1); assert.ok(r1.resources[KA][ODAY], 'المؤرشفُ باقٍ في الأرشيف');
  assert.deepEqual(strip(P), strip(r0.resources[KP]), 'الخطةُ خارج حقول الخيار كما هي');
  assert.deepEqual(strip(L1), strip(L0), 'الجولاتُ خارج حقول الخيار كما هي');
  /* سجلُّ النشاط: حدثٌ لكل مورد باسم المعدِّل */
  const rows = W.env.DB.q("SELECT uid, k, etype, act, ename, ctx, aft FROM aud WHERE ctx LIKE '%plan.optRef%' ORDER BY k");
  assert.deepEqual(rows.map((r) => r.k).sort(), [KO, KP, KR].sort(), JSON.stringify(rows.map((r) => r.k)));
  for (const r of rows) { assert.equal(r.uid, W.dmUid); assert.equal(r.act, 'edited'); assert.deepEqual(JSON.parse(r.aft).f.region, [RG, RG2]); assert.ok(JSON.parse(r.ctx).by.length > 0, 'اسمُ المعدِّل'); }
  const log = await W.C.api('/api/aud?dept=' + D + '&limit=20', { cookie: W.su });
  assert.ok(JSON.stringify(log.j).includes('plan.optRef'), 'يظهر في سجل النشاط: ' + JSON.stringify(log.j).slice(0, 300));
});

test('③ النوعُ يحمل فئاتِه وألوانَها · الفئةُ تُسمّى في نوعها · الدورُ في منطقته', async () => {
  const { W, r0 } = await seeded();
  let res = await optRef(W, { kind: 'ztype', was: TY, name: TY2, code: 'Q', base: r0.base[KO] });
  assert.equal(res.status, 200, JSON.stringify(res.j));
  let r1 = await read(W, [KP, KO, KR, KA]); let O = r1.resources[KO];
  assert.deepEqual(O.ztype[0], { n: TY2, k: 'Q', c: [CT] }); assert.equal(O.zcat[0].r, TY2, 'الفئةُ تتبع نوعَها');
  assert.deepEqual(O.zcatStyle, { [TY2 + ' · ' + CT]: { f: '#ff0000' } }, 'ولونُها');
  for (const z of zonesOf(r1.resources[KP]).concat(zonesOf(logical(r1)))) { assert.equal(z.ztype, TY2); assert.match(z.code, /-Q-0\d$/, z.uid); }
  res = await optRef(W, { kind: 'zcat', was: CT, reg: TY2, name: CT + ' ٢', base: r1.base[KO] });
  assert.equal(res.status, 200, JSON.stringify(res.j));
  r1 = await read(W, [KP, KO, KR, KA]); O = r1.resources[KO];
  assert.deepEqual(O.zcat[0], { n: CT + ' ٢', r: TY2 }); assert.deepEqual(O.ztype[0].c, [CT + ' ٢']); assert.deepEqual(Object.keys(O.zcatStyle), [TY2 + ' · ' + CT + ' ٢']);
  for (const z of zonesOf(r1.resources[KP]).concat(zonesOf(logical(r1)))) assert.equal(z.zcat, CT + ' ٢');
  res = await optRef(W, { kind: 'level', was: LV, reg: RG, name: LV + ' ٢', code: '7', base: r1.base[KO] });
  assert.equal(res.status, 200, JSON.stringify(res.j));
  r1 = await read(W, [KP, KR, KA]);
  for (const z of zonesOf(r1.resources[KP]).concat(zonesOf(logical(r1)))) if (/a$/.test(z.uid)) { assert.equal(z.level, LV + ' ٢'); assert.match(z.code, /^A-7-Q-/); } else assert.equal(z.level, 'TEST_ONLY دور آخر');
});

test('④ حدودُ الأمر: الحقول · الخيارُ الغائب · الاسمُ والرمزُ المكرّران · القاعدةُ المتحرّكة · إدارةٌ أخرى · من لا يملك التعديل', async () => {
  const { W, r0 } = await seeded();
  const b = r0.base[KO];
  assert.equal((await optRef(W, { kind: 'name', was: RG, name: RG2, code: 'N', base: b })).j.err, 'bad-body');
  assert.equal((await optRef(W, { kind: 'region', was: RG, name: RG2, code: 'N', base: b, value: {} })).j.err, 'bad-body', 'لا وثيقةَ تُرسل');
  assert.equal((await optRef(W, { kind: 'region', was: 'TEST_ONLY غائب', name: RG2, code: 'N', base: b })).j.err, 'opt-missing');
  assert.equal((await optRef(W, { kind: 'region', was: RG, name: 'TEST_ONLY أخرى', code: 'N', base: b })).j.err, 'opt-duplicate');
  assert.equal((await optRef(W, { kind: 'region', was: RG, name: RG2, code: 'B', base: b })).j.err, 'opt-code-duplicate');
  assert.equal((await optRef(W, { kind: 'region', was: RG, name: RG, code: 'A', base: b })).j.err, 'opt-unchanged');
  assert.equal((await optRef(W, { kind: 'region', was: RG, name: RG2, code: 'N', base: b + 1000 })).status, 409, 'قاعدةٌ متحرّكة');
  assert.equal((await optRef(W, { kind: 'region', was: RG, name: RG2, code: 'N', base: b, dept: 'tst_d2' })).status, 403, 'إدارةٌ أخرى');
  const emp = await W.C.login('0000000113', '70113'); assert.ok(emp.ok);
  const eu = (await W.C.api('/api/whoami', { cookie: emp.ck })).j.uid;
  const e = await optRef(W, { kind: 'region', was: RG, name: RG2, code: 'N', base: b }, emp.ck, eu);
  assert.notEqual(e.status, 200, 'موظفٌ بلا صلاحية تعديل الخيارات: ' + JSON.stringify(e.j).slice(0, 200));
  const after = await read(W, [KP, KO, KR, KA]);
  assert.deepEqual(after.resources, r0.resources, 'لا شيءَ كُتب');
});

/* ⑤ الواجهة: صفحتا الخطة والجولات ترسلان الخيارَ وحده إلى الأمر (لا وثيقة)، بأساس الكتالوج المقروء، وتعيدان قراءةَ مجموعة القراءة بعد النجاح */
test('⑤ الواجهة: plan.optRef@1 يرسل الخيارَ وحده بأساس الكتالوج ثم يعيد القراءة · والصفحتان تستعملانه للاسم والرمز', async () => {
  const vm = await import('node:vm');
  const sent = [], resync = [];
  const KIVO = { __BS_SRV: { rev: (k) => (k === 'bsdept:' + D + ':bassam_zone_opts_v1' ? 41 : 0), resync: () => { resync.push(1); return Promise.resolve({ ok: 1 }); },
    operations: { context: () => ({ uid: 'TEST_ONLY_u', dept: D }), key: (n) => 'bsdept:' + D + ':' + n } } };
  const fetch = async (url, o) => { sent.push({ url, body: JSON.parse(o.body), method: o.method }); return { json: async () => ({ ok: 1, zones: { plan: 3, rounds: 2 } }) }; };
  const ctx = vm.createContext({ KIVO, console, JSON, Object, Array, Error, Promise, fetch });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/core/060-bus.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/systems/plan/client/404-plan-p4.js'), 'utf8'), ctx);
  const j = await KIVO.bus.call('plan.optRef@1', { kind: 'region', was: RG, reg: '', name: RG2, code: 'N' });
  assert.equal(j && j.ok, 1, 'الأمرُ معلن: ' + JSON.stringify(j));
  assert.equal(sent.length, 1); assert.equal(sent[0].url, '/api/plan/opt-ref'); assert.equal(sent[0].method, 'POST');
  assert.equal(JSON.stringify(sent[0].body), JSON.stringify({ uid: 'TEST_ONLY_u', dept: D, kind: 'region', was: RG, name: RG2, base: 41, code: 'N' }));
  assert.equal(resync.length, 1, 'تُعاد القراءة فيصل الأثرُ بالانعكاس الحيّ');
  const lvl = await KIVO.bus.call('plan.optRef@1', { kind: 'zcat', was: CT, reg: TY, name: CT + '٢', code: '' });
  assert.equal(lvl.ok, 1); assert.equal(JSON.stringify(sent[1].body), JSON.stringify({ uid: 'TEST_ONLY_u', dept: D, kind: 'zcat', was: CT, name: CT + '٢', base: 41, reg: TY }), 'الفئةُ بلا رمز');
  for (const f of ['src/systems/plan/client/logic.js', 'src/systems/daily/client/logic.js']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8'), i = src.indexOf('  saveZoneOptEdit() {'), body = src.slice(i, src.indexOf('\n  }\n', i));
    assert.ok(i > 0 && /plan\.optRef@1|_optRefSend\(/.test(body), f + ': الاسمُ والرمزُ بالأمر المعلن');
  }
});
