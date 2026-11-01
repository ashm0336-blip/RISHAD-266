/* KIVO_263 · مراجعة مستقلة — محتوى الحاويات المخفيّ في كتابة الخطة (058: enfPlanHidden · enfPlanHiddenEval مدمجاً في enfScopeEval).
   المحرّكُ المثبَّت (010 · v24.9) لا يرى في وضع الكتابة: شهراً أُضيف أو حُذف كاملاً · عناصرَ طابقٍ أُضيف أو حُذف · تعديلَ حقلٍ غيرِ عدسيٍّ لطابقٍ داخل شهر —
   فكان يُدخَل موقعٌ خارج السقف بشهرٍ يحمله ويُحذف شهرٌ بمواقعَ خارجه. الإصلاحُ يستخرج هويّاتِ ذلك المحتوى بمستخرِج المحرّك نفسِه ويقيّمها
   بمقيِّمَي الإنفاذ (Site · Zone/Element) في سياق الكتابة نفسِه. على العامل الحقيقي بوضع الإنفاذ (إلا ما يُذكر) — قبولاً ورفضاً:
   (١) مديرُ الإدارة (tst_d1 · سقفُ المواقع [f:tsts1, f:tsts2]): شهرٌ جديد بمواقعَ داخل السقف ⇒ مقبول · وفيه موقعٌ خارجه ⇒ مرفوض «scope»
   (٢) …وحذفُ شهرٍ كامل: مواقعُه داخل السقف ⇒ مقبول · وفيه موقعٌ خارجه ⇒ مرفوض
   (٣) …وتعديلُ اسم طابقٍ داخل شهر (site.edit): موقعٌ داخل السقف ⇒ مقبول · خارجه ⇒ مرفوض
   (٤) إدارةٌ بلا سقفٍ ولا خطة (tst_d3): خطةٌ أولى من شهورٍ وحدها — مديرُ الإدارة ⇒ مرفوض «scope-unknown» · مديرُ النظام ⇒ مقبول (الخطةُ الأولى)
   (٥) بُعدُ Zone/Element: سقفُ عناصر «محدد» (tst_d2) — طابقٌ جديد (موقعُه داخل السقف) بعنصرٍ خارج سقف العناصر ⇒ مرفوض · بعناصرَ داخله ⇒ مقبول
   (٦) سقوفٌ «الكل» (tst_d2 كما في المُثبِّت): إضافةُ شهرٍ وحذفُه ⇒ مقبولان
   (٧) مديرُ النظام تحت سقفٍ «محدد» (D4-04): شهرٌ بموقعٍ خارج السقف ⇒ مرفوض · داخله ⇒ مقبول
   (٨) موظفٌ بنطاق مواقعَ صريح ([f:tsts1]) يملك plan.create بمنحٍ صريح: شهرٌ بموقعٍ خارج قائمته ⇒ مرفوض · بموقعٍ فيها ⇒ مقبول
   (٩) الوضعُ القديم (بلا إنفاذ): شهرٌ بموقعٍ خارج السقف من مدير الإدارة ⇒ مقبولٌ كما كان (لا رفضَ جديد)
   (١٠) enfPlanHidden نفسُها: هويّاتُ المحرّك لكل حاوية (دالةٌ نقيّة) · وبوابةُ التقييم (مفتاحٌ بلا Site/Zone ⇒ لا تقييم)
   الحالةُ المخزَّنة تُزرع في D1 مباشرةً بـSQL (كما يزرع المُثبِّت tests/fixtures/gen_fixture.py) — والكتابةُ المختبَرة عبر /api/save. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, since, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';
import { internals } from './internals.mjs';

const T = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; }); return o; })();
/* شهورُ السنة القادمة: مفتوحةٌ دائماً (لا قفلَ زمنيّ يتدخّل) — فالحكمُ حكمُ النطاق وحده */
const NK = (n) => (T.year + 1) + '-' + n;
function seed() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_psh_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', T.year + '-' + T.month + '-' + T.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const PK = (d) => 'bsdept:' + d + ':bassam_plan_v1', SK = (d) => 'bsdept:' + d + ':bassam_scope_v1', GK = (d) => 'bsdept:' + d + ':bassam_grants_v1';
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const stored = (env, k) => { const r = env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k); return r.length ? JSON.parse(r.map(x => x.v).join('')) : null; };
const BUMP = (k) => ["INSERT INTO meta (k, v) VALUES ('rev', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(meta.v AS INTEGER) + 1 AS TEXT);",
  'INSERT INTO revs (k, rev) VALUES (' + q(k) + ", (SELECT CAST(v AS INTEGER) FROM meta WHERE k = 'rev')) ON CONFLICT(k) DO UPDATE SET rev = excluded.rev;"];
/* زرعُ قيمةِ مفتاحٍ بـSQL كما المُثبِّت (v === null ⇒ لا قيمة) ثم مراجعةٌ جديدة له */
async function putKey(env, k, v) {
  const s = ['DELETE FROM kv WHERE k = ' + q(k) + ';'];
  if (v !== null) s.push('INSERT INTO kv (k, seq, v) VALUES (' + q(k) + ', 0, ' + q(JSON.stringify(v)) + ');');
  await applySql(env.DB, s.concat(BUMP(k)).join('\n'));
  await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
  assert.deepEqual(stored(env, k), v, 'الزرع: ' + k);
}
/* تعديلُ جزءٍ من قيمةٍ مزروعة (json_set) — كما يدمج المُثبِّتُ السجلاتِ دمجاً */
async function setIn(env, k, jpath, v) {
  await applySql(env.DB, ['UPDATE kv SET v = json_set(v, ' + q(jpath) + ', json(' + q(JSON.stringify(v)) + ')) WHERE k = ' + q(k) + ' AND seq = 0;'].concat(BUMP(k)).join('\n'));
}
async function world(mode = 'enforce') {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : { KIVO_TEST_FIXTURE: 'allow' }); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'admin');
  await applySql(env.DB, seed());
  await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const login = async (u, p) => { const r = await C.login(u, p); assert.ok(r.ok, 'دخول ' + u); return r; };
  return { env, C, su, login };
}
const save = async (W, ck, k, v) => { const r = await W.C.save(ck, { [k]: JSON.stringify(v) }); const j = r.j || {}; return { ok: !!(j.revs && j.revs[k]), d: (j.denied || {})[k] || null, s: JSON.stringify(j.denied || j).slice(0, 300) }; };
async function allowed(W, ck, k, v, label) {
  const r = await save(W, ck, k, v);
  assert.ok(r.ok, label + ' — رُفضت: ' + r.s);
  assert.deepEqual(stored(W.env, k), v, label + ' — القيمةُ في القاعدة كما أُرسلت');
}
/* مرفوضٌ بسببه (why) وتفصيلُه يطابق rx — والقيمةُ المخزَّنة لم تتغيّر */
async function denied(W, ck, k, v, label, why, rx) {
  const before = stored(W.env, k), r = await save(W, ck, k, v);
  assert.ok(!r.ok, label + ' — قُبلت: ' + r.s);
  assert.equal(r.d && r.d.why, why, label + ' — ' + r.s);
  assert.match(String(r.d.detail || ''), rx, label + ' — ' + r.s);
  assert.deepEqual(stored(W.env, k), before, label + ' — القيمةُ المخزَّنة تغيّرت');
}
const cp = (o) => JSON.parse(JSON.stringify(o));
const TAG = 'TEST_ONLY';
const zone = (uid, x0) => ({ uid, code: uid.toUpperCase(), name: TAG + ' ' + uid, d: 'M' + x0 + ' 0 L' + (x0 + 10) + ' 0 L' + (x0 + 10) + ' 10 L' + x0 + ' 10 Z', cx: x0 + 5, cy: 5, area: 100, emp: [] });
/* طابقٌ بعناصرَ من كل عمود (هويّةُ العنصر u:<uid> · هويّةُ الموقع f:<sid>) — بلا حقول حالة (فلا يتدخّل إسقاطُ القراءة) */
const floor = (sid, n) => ({ sid, name: TAG + ' موقع ' + sid, num: n, zones: [zone('tsthz' + n + 'a', 0), zone('tsthz' + n + 'b', 20)], gates: [{ uid: 'tsthg' + n, id: 'THG' + n, num: String(n), x: 10, y: 10, emp: [] }], marks: [{ uid: 'tsthm' + n, id: 'THM' + n, label: TAG + ' معلم ' + n, x: 3, y: 4, emp: [] }], paths: [{ uid: 'tsthp' + n, id: 'THP' + n, pts: [[0, 0], [5, 5]], active: true }] });
const OUT = () => floor('tstout9', 9);                       /* موقعٌ خارج سقف tst_d1 */
const D1 = 'tst_d1', D2 = 'tst_d2', D3 = 'tst_d3';
const OUT_NEW = /hidden:Site=Site-outside-department-ceiling \(new:f:tstout9\)/, OUT_OLD = /hidden:Site=Site-outside-department-ceiling \(old:f:tstout9\)/;

test('(١) مديرُ الإدارة · شهرٌ جديد: مواقعُ داخل السقف ⇒ مقبول · وفيه موقعٌ خارجه ⇒ مرفوض «scope»', since(163), async (t) => {
  const W = await world(), dm = await W.login('0000000101', '70101');
  const P0 = stored(W.env, PK(D1)), F1 = P0.floors[0], F2 = P0.floors[1];
  assert.deepEqual([F1.sid, F2.sid], ['tsts1', 'tsts2'], 'المُثبِّت: موقعا tst_d1 داخل سقفه');
  const add = (k, m) => { const v = stored(W.env, PK(D1)); v.months[k] = m; return v; };
  await t.test('{c, d} بموقعَي السقف وعناصرِهما ⇒ مقبول', async () => { await allowed(W, dm.ck, PK(D1), add(NK(1), { c: 1, d: [cp(F1), cp(F2)] }), 'شهرٌ داخل السقف'); });
  await t.test('مصفوفةُ طوابق داخل السقف ⇒ مقبول', async () => { await allowed(W, dm.ck, PK(D1), add(NK(2), [cp(F1)]), 'شهرٌ مصفوفة'); });
  await t.test('{c, d} وفيه موقعٌ خارج السقف ⇒ مرفوض', async () => { await denied(W, dm.ck, PK(D1), add(NK(3), { c: 1, d: [cp(F1), OUT()] }), 'شهرٌ بموقعٍ خارج السقف', 'scope', OUT_NEW); });
  await t.test('مصفوفةٌ بموقعٍ خارج السقف وحده ⇒ مرفوض', async () => { await denied(W, dm.ck, PK(D1), add(NK(4), [OUT()]), 'شهرٌ مصفوفة خارج السقف', 'scope', OUT_NEW); });
});

test('(٢) مديرُ الإدارة · حذفُ شهرٍ كامل: مواقعُه داخل السقف ⇒ مقبول · وفيه موقعٌ خارجه ⇒ مرفوض', since(163), async (t) => {
  const W = await world(), dm = await W.login('0000000101', '70101');
  const P = stored(W.env, PK(D1)), F1 = P.floors[0], F2 = P.floors[1];
  P.months[NK(1)] = { c: 1, d: [cp(F1), cp(F2)] }; P.months[NK(2)] = { c: 1, d: [cp(F1), OUT()] }; P.months[NK(3)] = [OUT()];
  await putKey(W.env, PK(D1), P);                            /* محتوى خارج السقف قائمٌ مسبقاً (زرعٌ مباشر — كأنه من قبل السقف) */
  const del = (k) => { const v = stored(W.env, PK(D1)); delete v.months[k]; return v; };
  await t.test('حذفُ شهرٍ مواقعُه داخل السقف ⇒ مقبول', async () => { await allowed(W, dm.ck, PK(D1), del(NK(1)), 'حذفٌ داخل السقف'); });
  await t.test('حذفُ شهرٍ {c, d} فيه موقعٌ خارج السقف ⇒ مرفوض', async () => { await denied(W, dm.ck, PK(D1), del(NK(2)), 'حذفُ شهرٍ بموقعٍ خارج السقف', 'scope', OUT_OLD); });
  await t.test('حذفُ شهرٍ مصفوفة بموقعٍ خارج السقف ⇒ مرفوض', async () => { await denied(W, dm.ck, PK(D1), del(NK(3)), 'حذفُ شهرٍ مصفوفة خارج السقف', 'scope', OUT_OLD); });
});

test('(٣) مديرُ الإدارة · تعديلُ طابقٍ داخل شهر (site.edit — حقلٌ غيرُ عدسيّ): موقعٌ داخل السقف ⇒ مقبول · خارجه ⇒ مرفوض', since(163), async (t) => {
  const W = await world(), dm = await W.login('0000000101', '70101');
  const P = stored(W.env, PK(D1)), F1 = P.floors[0];
  P.months[NK(1)] = { c: 1, d: [cp(F1), OUT()] };
  await putKey(W.env, PK(D1), P);
  const edit = (i, f, val) => { const v = stored(W.env, PK(D1)); v.months[NK(1)].d[i][f] = val; return v; };
  await t.test('اسمُ طابقٍ داخل السقف ⇒ مقبول', async () => { await allowed(W, dm.ck, PK(D1), edit(0, 'name', TAG + ' اسمٌ جديد'), 'تسميةٌ داخل السقف'); });
  await t.test('اسمُ طابقٍ خارج السقف ⇒ مرفوض', async () => { await denied(W, dm.ck, PK(D1), edit(1, 'name', TAG + ' اسمٌ جديد'), 'تسميةٌ خارج السقف', 'scope', OUT_OLD); });
  await t.test('رقمُ طابقٍ خارج السقف ⇒ مرفوض', async () => { await denied(W, dm.ck, PK(D1), edit(1, 'num', 99), 'ترقيمٌ خارج السقف', 'scope', OUT_OLD); });
});

test('(٤) إدارةٌ بلا سقفٍ ولا خطة (tst_d3): خطةٌ أولى من شهورٍ وحدها — مديرُ الإدارة ⇒ «scope-unknown» · مديرُ النظام ⇒ مقبول (الخطةُ الأولى)', since(163), async (t) => {
  const W = await world(), dm3 = await W.login('0000000104', '70104');
  assert.equal(stored(W.env, SK(D3)), null, 'لا سجلَّ نطاقٍ ⇒ السقفُ غير محسوم');
  const SHAPES = { '{c, d}': (f) => ({ c: 1, d: [f] }), 'مصفوفة': (f) => [f] };
  for (const [nm, mk] of Object.entries(SHAPES)) {
    await t.test('مديرُ الإدارة · شهرٌ ' + nm + ' ⇒ مرفوض', async () => { await putKey(W.env, PK(D3), null); await denied(W, dm3.ck, PK(D3), { months: { [NK(1)]: mk(floor('tstfp1', 1)) } }, 'مديرُ الإدارة · ' + nm, 'scope-unknown', /hidden:Site=unmigrated-department-ceiling/); });
    await t.test('مديرُ النظام · شهرٌ ' + nm + ' ⇒ مقبول', async () => { await putKey(W.env, PK(D3), null); await allowed(W, W.su.ck, PK(D3), { months: { [NK(1)]: mk(floor('tstfp1', 1)) } }, 'مديرُ النظام · ' + nm); assert.equal(stored(W.env, SK(D3)), null, 'ولا سقفَ كُتب ضمناً'); });
  }
  await t.test('مديرُ النظام · طوابقُ وشهرٌ بمحتواه في الكتابة الأولى ⇒ مقبول', async () => { await putKey(W.env, PK(D3), null); const F = floor('tstfp1', 1); await allowed(W, W.su.ck, PK(D3), { floors: [F], months: { [NK(1)]: { c: 1, d: [cp(F)] } } }, 'الخطةُ الأولى بشهرها'); });
  await t.test('…ثم شهرٌ آخر بعدها (الخطةُ قائمة) ⇒ «scope-unknown» حتى لمدير النظام', async () => { const v = stored(W.env, PK(D3)); v.months[NK(2)] = { c: 1, d: [cp(v.floors[0])] }; await denied(W, W.su.ck, PK(D3), v, 'شهرٌ بعد الأولى', 'scope-unknown', /hidden:Site=unmigrated-department-ceiling/); });
});

test('(٥) بُعدُ Zone/Element · سقفُ عناصر «محدد» (tst_d2): عنصرٌ خارج السقف داخل حاويةٍ جديدة ⇒ مرفوض · داخله ⇒ مقبول', since(163), async (t) => {
  const W = await world(), dm2 = await W.login('0000000102', '70102');
  const F21 = stored(W.env, PK(D2)).floors[0];
  assert.equal(F21.sid, 'tsts21', 'المُثبِّت: موقعُ tst_d2');
  const own = ['zones', 'gates', 'marks', 'paths'].flatMap(c => F21[c].map(e => 'u:' + e.uid));
  await setIn(W.env, SK(D2), '$.ceiling', { Site: { mode: 'list', list: ['f:tsts21', 'f:tstn1', 'f:tstn2'] }, 'Zone/Element': { mode: 'list', list: own.concat(['u:tstnz1']) } });
  const nf = (sid, uid) => ({ sid, name: TAG + ' ' + sid, num: 5, zones: [zone(uid, 0)], gates: [], marks: [], paths: [] });
  const addFloor = (f) => { const v = stored(W.env, PK(D2)); v.floors.push(f); return v; };
  const ZOUT = /hidden:Zone\/Element=Zone\/Element-outside-department-ceiling \(new:u:tstnz9\)/;
  await t.test('طابقٌ جديد بعنصرٍ داخل سقف العناصر ⇒ مقبول', async () => { await allowed(W, dm2.ck, PK(D2), addFloor(nf('tstn1', 'tstnz1')), 'عنصرٌ داخل السقف'); });
  await t.test('طابقٌ جديد (موقعُه داخل السقف) بعنصرٍ خارج سقف العناصر ⇒ مرفوض', async () => { await denied(W, dm2.ck, PK(D2), addFloor(nf('tstn2', 'tstnz9')), 'عنصرٌ خارج السقف', 'scope', ZOUT); });
  await t.test('شهرٌ جديد بعنصرٍ خارج سقف العناصر ⇒ مرفوض', async () => { const v = stored(W.env, PK(D2)); v.months = { [NK(1)]: { c: 1, d: [nf('tstn1', 'tstnz9')] } }; await denied(W, dm2.ck, PK(D2), v, 'شهرٌ بعنصرٍ خارج السقف', 'scope', ZOUT); });
  await t.test('شهرٌ جديد بعناصر داخل السقف ⇒ مقبول', async () => { const v = stored(W.env, PK(D2)); v.months = { [NK(1)]: { c: 1, d: [cp(F21)] } }; await allowed(W, dm2.ck, PK(D2), v, 'شهرٌ بعناصرَ داخل السقف'); });
});

test('(٦) سقوفٌ «الكل» (tst_d2 كما في المُثبِّت): إضافةُ شهرٍ وحذفُه ⇒ مقبولان', since(163), async (t) => {
  const W = await world(), dm2 = await W.login('0000000102', '70102');
  const rec = stored(W.env, SK(D2)); assert.deepEqual(rec.ceiling, { Site: { mode: 'ALL' }, 'Zone/Element': { mode: 'ALL' } }, 'المُثبِّت: سقفا tst_d2 «الكل»');
  const F21 = stored(W.env, PK(D2)).floors[0];
  await t.test('إضافةُ شهرٍ (موقعُ الإدارة وموقعٌ جديد) ⇒ مقبول', async () => { const v = stored(W.env, PK(D2)); v.months = { [NK(1)]: { c: 1, d: [cp(F21), floor('tstany5', 5)] } }; await allowed(W, dm2.ck, PK(D2), v, 'إضافةٌ تحت «الكل»'); });
  await t.test('حذفُه ⇒ مقبول', async () => { const v = stored(W.env, PK(D2)); delete v.months[NK(1)]; await allowed(W, dm2.ck, PK(D2), v, 'حذفٌ تحت «الكل»'); });
});

test('(٧) مديرُ النظام تحت سقفٍ «محدد» (tst_d1 · D4-04): شهرٌ بموقعٍ خارج السقف ⇒ مرفوض · داخله ⇒ مقبول', since(163), async (t) => {
  const W = await world(), F1 = stored(W.env, PK(D1)).floors[0];
  const add = (k, m) => { const v = stored(W.env, PK(D1)); v.months[k] = m; return v; };
  await t.test('شهرٌ بموقعٍ خارج السقف ⇒ مرفوض', async () => { await denied(W, W.su.ck, PK(D1), add(NK(1), { c: 1, d: [cp(F1), OUT()] }), 'مديرُ النظام · خارج السقف', 'scope', OUT_NEW); });
  await t.test('شهرٌ داخل السقف ⇒ مقبول', async () => { await allowed(W, W.su.ck, PK(D1), add(NK(2), { c: 1, d: [cp(F1)] }), 'مديرُ النظام · داخل السقف'); });
});

test('(٨) موظفٌ بنطاق مواقعَ صريح ([f:tsts1]) ويملك plan.create بمنحٍ صريح: شهرٌ بموقعٍ خارج قائمته ⇒ مرفوض · بموقعٍ فيها ⇒ مقبول', since(163), async (t) => {
  const W = await world();
  await setIn(W.env, SK(D1), '$.emp.tst_e_lens_on.Site', { mode: 'list', list: ['f:tsts1'] });
  await setIn(W.env, GK(D1), '$.emp.tst_e_lens_on', { plus: ['plan.create'], src: TAG });
  const emp = await W.login('0000000114', '70114');
  const P0 = stored(W.env, PK(D1)), F1 = P0.floors[0], F2 = P0.floors[1];
  const add = (k, m) => { const v = stored(W.env, PK(D1)); v.months[k] = m; return v; };
  await t.test('شهرٌ بموقعٍ في قائمته ⇒ مقبول', async () => { await allowed(W, emp.ck, PK(D1), add(NK(1), { c: 1, d: [cp(F1)] }), 'موظف · داخل قائمته'); });
  await t.test('شهرٌ بموقعٍ داخل سقف الإدارة وخارج قائمته ⇒ مرفوض', async () => { await denied(W, emp.ck, PK(D1), add(NK(2), { c: 1, d: [cp(F2)] }), 'موظف · خارج قائمته', 'scope', /hidden:Site=Site-out-of-scope \(new:f:tsts2\)/); });
});

test('(٩) الوضعُ القديم (بلا إنفاذ): شهرٌ بموقعٍ خارج السقف من مدير الإدارة ⇒ مقبولٌ كما كان', since(163), async () => {
  const W = await world('legacy'), dm = await W.login('0000000101', '70101');
  const v = stored(W.env, PK(D1)); v.months[NK(1)] = { c: 1, d: [cp(v.floors[0]), OUT()] };
  await allowed(W, dm.ck, PK(D1), v, 'الوضعُ القديم');
});

test('(١٠) enfPlanHidden: هويّاتُ المحرّك لكل حاوية · وبوابةُ التقييم', since(163), async () => {
  const { enfPlanHidden, enfPlanHiddenEval } = await internals(['enfPlanHidden', 'enfPlanHiddenEval']);
  const s = (p) => p ? (p.old == null ? '' : p.old) + '>' + (p.new == null ? '' : p.new) : '';
  const fmt = (a, b) => enfPlanHidden(a, b).map(h => h.kind + ' ' + s(h.site) + (h.element && (h.element.old != null || h.element.new != null) ? ' ' + s(h.element) : '')).sort();
  const X = { sid: 'x', name: 'X', zones: [{ uid: 'z1' }], gates: [{ id: 'G1' }] }, Y = { sid: 'y', zones: [], paths: [{ uid: 'p1' }] };
  const addX = ['added >f:x', 'added >f:x >g:G1', 'added >f:x >u:z1'], remX = ['removed f:x>', 'removed f:x> g:G1>', 'removed f:x> u:z1>'];
  assert.deepEqual(fmt({}, { months: { m: { c: 1, d: [X] } } }), addX, 'شهرٌ مضاف {c, d}');
  assert.deepEqual(fmt({}, { months: { m: [X] } }), addX, 'شهرٌ مضاف مصفوفة');
  assert.deepEqual(fmt({ months: { m: [X] } }, {}), remX, 'شهرٌ محذوف');
  assert.deepEqual(fmt({ months: { m: [Y] } }, { months: { m: [Y, X] } }), addX, 'طابقٌ مضاف داخل شهرٍ قائم');
  assert.deepEqual(fmt({ months: { m: { c: 1, d: [X, Y] } } }, { months: { m: { c: 1, d: [Y] } } }), remX, 'طابقٌ محذوف داخل شهرٍ قائم');
  assert.deepEqual(fmt({ months: { m: [X] } }, { months: { m: [Object.assign({}, X, { name: 'X2' })] } }), ['changed f:x>f:x'], 'حقلٌ غيرُ عدسيّ داخل شهر ⇒ الموقعُ بالجانبين');
  assert.deepEqual(fmt({ months: { m: [X] } }, { months: { m: [Object.assign({}, X, { zones: [{ uid: 'z1', name: 'n' }] })] } }), [], 'تعديلٌ عدسيّ يراه المحرّك');
  assert.deepEqual(fmt({ months: { m: [X] } }, { months: { m: [Object.assign({}, X, { approved: true })] } }), [], 'الاعتمادُ يراه المحرّك (floorAp)');
  assert.deepEqual(fmt({ floors: [Y] }, { floors: [Y, X] }), addX, 'طابقٌ أعلى مضاف: محتواه');
  assert.deepEqual(fmt({ floors: [X] }, { floors: [Object.assign({}, X, { name: 'X2' })] }), [], 'حقلُ طابقٍ أعلى يراه المحرّك (floorEdit)');
  assert.deepEqual(fmt({ floors: [X], months: { m: [X] } }, { floors: [X], months: { m: { c: 1, d: [X] } } }), [], 'تغيّرُ شكل الشهر وحده ⇒ لا شيء');
  assert.deepEqual(fmt({ floors: [{ zones: [{ uid: 'q' }] }] }, { floors: [{ zones: [{ uid: 'q' }] }, { zones: [{ uid: 'r' }] }] }), ['added >#1', 'added >#1 >u:r'], 'طابقٌ بلا sid: هويّةُ موضعه كما المحرّك');
  const R0 = enfPlanHiddenEval({}, ['backup.restore'], {}, { months: { m: [X] } });
  assert.deepEqual([R0.n, R0.deny.length, R0.unknown.length], [0, 0, 0], 'مفتاحٌ بلا Site/Zone ⇒ لا تقييم');
});
