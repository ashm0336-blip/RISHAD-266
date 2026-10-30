/* KIVO_263 · مراجعة مستقلة — SOT-188 · ADR-031 «الخطةُ الأولى»: يُفتح لمدير النظام وحده إنشاءُ الخطة الأولى لإدارةٍ بلا خطةٍ ولا سقف — الإنشاءُ وحده.
   الثغرة: enfPlanEmpty كانت تفحص floors العليا وحدها، فخطةٌ مخزَّنة طوابقُها العليا فارغة وفيها خطةُ شهرٍ (months[k]: مصفوفةُ طوابق أو {c, d:[…]})
   أو عناصرُ في مرآة الجذر (zones · gates · marks · paths) كانت «فارغة» ⇒ يعدّل مديرُ النظام ذلك المحتوى أو يحذفه تحت سقفٍ «غير محسوم».
   الإصلاح (058): «فارغة» = لا موقعَ ولا عنصرَ يراه مستخرِجُ محرّك النطاق (KIVO_SCOPE.extract بوضع القراءة).
   على العامل الحقيقي بوضع الإنفاذ — tst_d3 بلا سجلّ نطاق ⇒ سقفُ Site وZone/Element = null («غير محسوم»):
   (أ) لا خطةَ للإدارة ⇒ مديرُ النظام ينشئ الخطةَ الأولى ⇒ مقبولة (ولا سقفَ يُكتب ضمناً) — وكما يحفظها العميل، وفوق هيكلٍ بلا موقعٍ ولا عنصر
   (ب) طوابقُ عليا فارغة + خطةُ شهرٍ بموقعٍ وعناصر (بالشكلين) ⇒ تعديلُ مدير النظام لمحتواها أو حذفُه أو الإضافةُ بجوارها ⇒ مرفوض «scope-unknown»
   (ج) مثلُها بمحتوى مرآة الجذر وحده ⇒ مرفوض
   (د) مديرُ الإدارة لا يستعمل الاستثناء ⇒ مرفوض
   (هـ) بعد إنشاء الخطة الأولى بطوابق: إضافةُ مدير النظام أو تعديلُه تحت السقف غير المحسوم ⇒ مرفوض
   (و) enfPlanEmpty نفسُها على الأشكال (دالةٌ نقيّة عبر internals)
   الحالةُ المخزَّنة تُزرع في D1 مباشرةً بـSQL (كما يزرع المُثبِّت tests/fixtures/gen_fixture.py) — لا عبر /api/save. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, since, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { internals } from './internals.mjs';

/* اليومُ الهجري للخادم (أم القرى · الرياض · مهلةُ 3 ساعات) — كما restore_full_super */
const T = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; }); return o; })();
/* خطةُ شهرٍ في السنة القادمة: مفتوحةٌ دائماً (لا قفلَ زمنيّ يتدخّل عند حدود الشهر) — فيبقى الرفضُ رفضَ السقف وحده */
const MK = (T.year + 1) + '-' + T.month;
function seed() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_fp_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', T.year + '-' + T.month + '-' + T.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const D = 'tst_d3', K = 'bsdept:' + D + ':bassam_plan_v1', SK = 'bsdept:' + D + ':bassam_scope_v1';
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
/* القيمةُ المخزَّنة من D1 مباشرةً (الأجزاءُ بترتيبها) — null إن غابت */
const stored = (env, k) => { const r = env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k); return r.length ? JSON.parse(r.map(x => x.v).join('')) : null; };
/* زرعُ خطة الإدارة بـSQL كما المُثبِّت: الصفُّ في kv ثم مراجعةٌ جديدة للمفتاح (meta.rev · revs) — v === null ⇒ لا خطة */
async function putPlan(env, v) {
  const s = ['DELETE FROM kv WHERE k = ' + q(K) + ';'];
  if (v !== null) s.push('INSERT INTO kv (k, seq, v) VALUES (' + q(K) + ', 0, ' + q(JSON.stringify(v)) + ');');
  s.push("INSERT INTO meta (k, v) VALUES ('rev', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(meta.v AS INTEGER) + 1 AS TEXT);");
  s.push('INSERT INTO revs (k, rev) VALUES (' + q(K) + ", (SELECT CAST(v AS INTEGER) FROM meta WHERE k = 'rev')) ON CONFLICT(k) DO UPDATE SET rev = excluded.rev;");
  await applySql(env.DB, s.join('\n'));
  assert.deepEqual(stored(env, K), v, 'الزرع');
}
async function world() {
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' }); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'admin');
  await applySql(env.DB, seed());
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const dm = await C.login('0000000104', '70104'); assert.ok(dm.ok, 'tst_dm3');
  await putPlan(env, null);                                                    /* إدارةٌ «بلا خطة» كالإدارات الأربع عشرة */
  assert.equal(stored(env, SK), null, 'لا سجلَّ نطاقٍ للإدارة ⇒ السقفُ غير محسوم');
  return { env, C, su, dm };
}
const save = async (W, ck, v) => { const r = await W.C.save(ck, { [K]: JSON.stringify(v) }); const j = r.j || {}; return { ok: !!(j.revs && j.revs[K]), d: (j.denied || {})[K] || null, s: JSON.stringify(j.denied || j).slice(0, 240) }; };
async function allowed(W, ck, v, label) {
  const r = await save(W, ck, v);
  assert.ok(r.ok, label + ' — رُفضت: ' + r.s);
  assert.deepEqual(stored(W.env, K), v, label + ' — الخطةُ في القاعدة كما أُرسلت');
  assert.equal(stored(W.env, SK), null, label + ' — ولا سقفَ كُتب ضمناً');
}
/* مرفوضٌ «scope-unknown» بسبب السقف غير المحسوم (لا استثناء) — والقيمةُ المخزَّنة لم تتغيّر */
async function denied(W, ck, v, before, label) {
  const r = await save(W, ck, v);
  assert.ok(!r.ok, label + ' — قُبلت (الاستثناءُ طُبّق على خطةٍ قائمة): ' + r.s);
  assert.equal(r.d && r.d.why, 'scope-unknown', label + ' — ' + r.s);
  assert.match(String(r.d.detail || ''), /unmigrated-department-ceiling/, label + ' — ' + r.s);
  assert.deepEqual(stored(W.env, K), before, label + ' — القيمةُ المخزَّنة تغيّرت');
}
const cp = (o) => JSON.parse(JSON.stringify(o));
const TAG = 'TEST_ONLY';
function zone(uid, code, x0) { return { uid, code, name: TAG + ' ' + code, d: 'M' + x0 + ' 0 L' + (x0 + 10) + ' 0 L' + (x0 + 10) + ' 10 L' + x0 + ' 10 Z', cx: x0 + 5, cy: 5, area: 100, emp: [] }; }
const gate = (uid, id, n) => ({ uid, id, num: String(n), x: 10 * n, y: 10, emp: [] });
const mark = (uid, id, n) => ({ uid, id, label: TAG + ' معلم ' + n, x: 3, y: 4 * n, emp: [] });
const pth = (uid, id, n) => ({ uid, id, pts: [[0, 0], [5, 5 * n]], active: true });
function floor(sid, k) { return { sid, name: TAG + ' موقع ' + k, num: k, zones: [zone('tstfpz' + k + 'a', 'TFZ' + k + 'A', 0), zone('tstfpz' + k + 'b', 'TFZ' + k + 'B', 20)], gates: [gate('tstfpg' + k, 'TFG' + k, k)], marks: [mark('tstfpm' + k, 'TFM' + k, k)], paths: [pth('tstfpp' + k, 'TFP' + k, k)] }; }
/* الخطةُ كما يحفظها العميل: الطوابق · لقطةُ الشهر {c, d} · مرآةُ الموقع النشط في الجذر */
function clientPlan(F) { return { floors: [F], months: { [MK]: { c: 1, d: [cp(F)] } }, zones: cp(F.zones), gates: cp(F.gates), marks: cp(F.marks), paths: cp(F.paths) }; }
const SKELETON = { floors: [], months: { [MK]: { c: 1, d: [] } }, zones: [], gates: [], marks: [], paths: [] };

test('(أ/a) لا خطةَ ولا سقف ⇒ مديرُ النظام ينشئ الخطةَ الأولى (طابقاً · كما يحفظها العميل · فوق هيكلٍ بلا موقعٍ ولا عنصر)', since(163), async (t) => {
  const W = await world();
  const CASES = {
    'طابق': [null, { floors: [floor('tstfp1', 1)] }],
    'كما يحفظها العميل (طوابق · لقطةُ شهر · مرآة)': [null, clientPlan(floor('tstfp1', 1))],
    'فوق هيكلٍ فارغ (شهرٌ بلا مواقع · مرآةٌ فارغة)': [SKELETON, Object.assign(cp(SKELETON), { floors: [floor('tstfp1', 1)] })],
  };
  for (const [nm, [before, v]] of Object.entries(CASES)) await t.test(nm, async () => { await putPlan(W.env, before); await allowed(W, W.su.ck, v, 'الخطةُ الأولى · ' + nm); });
});

test('(ب/b) طوابقُ عليا فارغة + خطةُ شهرٍ بموقعٍ وعناصر ⇒ تعديلُ مدير النظام أو حذفُه أو الإضافةُ إليها مرفوض — بشكلَي months[k]', since(163), async (t) => {
  const W = await world();
  const SHAPES = { 'months[k] = [طوابق]': (f) => [f], 'months[k] = {c, d}': (f) => ({ c: 1, d: [f] }) };
  for (const [shape, mk] of Object.entries(SHAPES)) {
    const P = { floors: [], months: { [MK]: mk(floor('tstfm1', 7)) } };
    const ds = (v) => Array.isArray(v.months[MK]) ? v.months[MK] : v.months[MK].d;      /* طوابقُ خطة الشهر بالشكلين */
    const EDITS = {
      'تعديلُ مصلى في موقع الشهر': (v) => { ds(v)[0].zones[0].name = TAG + ' تعديل'; },
      'حذفُ بوابةٍ من موقع الشهر': (v) => { ds(v)[0].gates = []; },
      'إضافةُ مصلى إلى موقع الشهر': (v) => { ds(v)[0].zones.push(zone('tstfpz7c', 'TFZ7C', 40)); },
      'حذفُ موقع الشهر': (v) => { ds(v).length = 0; },
      'إضافةُ موقعٍ ثانٍ إلى خطة الشهر': (v) => { ds(v).push(floor('tstfm2', 8)); },
      'إضافةُ طابقٍ أعلى بجوار خطة الشهر (الخطةُ قائمة — ليست الأولى)': (v) => { v.floors = [floor('tstfp1', 1)]; },
    };
    for (const [nm, edit] of Object.entries(EDITS)) await t.test(shape + ' · ' + nm, async () => { await putPlan(W.env, P); const v = cp(P); edit(v); await denied(W, W.su.ck, v, P, shape + ' · ' + nm); });
  }
});

test('(ج/c) طوابقُ عليا فارغة + محتوى مرآة الجذر وحده ⇒ تعديلُ مدير النظام أو حذفُه أو الإضافةُ بجواره مرفوض', since(163), async (t) => {
  const W = await world();
  const P = { floors: [], zones: [zone('tstrz1', 'TRZ1', 0)], gates: [gate('tstrg1', 'TRG1', 1)], marks: [mark('tstrm1', 'TRM1', 1)], paths: [pth('tstrp1', 'TRP1', 1)] };
  const EDITS = {
    'تعديلُ مصلى الجذر': (v) => { v.zones[0].name = TAG + ' تعديل'; },
    'حذفُ بوابة الجذر': (v) => { v.gates = []; },
    'حذفُ معلم الجذر': (v) => { v.marks = []; },
    'إضافةُ مصلى إلى الجذر': (v) => { v.zones.push(zone('tstrz2', 'TRZ2', 20)); },
    'إضافةُ طابقٍ بجوار المرآة (الخطةُ قائمة — ليست الأولى)': (v) => { v.floors = [floor('tstfp1', 1)]; },
  };
  for (const [nm, edit] of Object.entries(EDITS)) await t.test('مرآة الجذر · ' + nm, async () => { await putPlan(W.env, P); const v = cp(P); edit(v); await denied(W, W.su.ck, v, P, 'مرآة الجذر · ' + nm); });
});

test('(د/d) مديرُ الإدارة لا يستعمل استثناءَ الخطة الأولى ⇒ مرفوض «scope-unknown» ولا يُكتب شيء', since(163), async (t) => {
  const W = await world();
  const CASES = {
    'طابق': [null, { floors: [floor('tstfp1', 1)] }],
    'كما يحفظها العميل': [null, clientPlan(floor('tstfp1', 1))],
    'فوق هيكلٍ فارغ': [SKELETON, Object.assign(cp(SKELETON), { floors: [floor('tstfp1', 1)] })],
  };
  for (const [nm, [before, v]] of Object.entries(CASES)) await t.test('مديرُ الإدارة · ' + nm, async () => { await putPlan(W.env, before); await denied(W, W.dm.ck, v, before, 'مديرُ الإدارة · ' + nm); });
});

test('(هـ/e) بعد إنشاء الخطة الأولى بطوابق ⇒ إضافةُ مدير النظام أو تعديلُه تحت السقف غير المحسوم مرفوض', since(163), async (t) => {
  const W = await world();
  const v1 = { floors: [floor('tstfp1', 1)] };
  await allowed(W, W.su.ck, v1, 'الخطةُ الأولى');
  const now = stored(W.env, K);
  const EDITS = {
    'إضافةُ طابقٍ ثانٍ': (v) => { v.floors.push(floor('tstfp2', 2)); },
    'إضافةُ مصلى إلى الطابق': (v) => { v.floors[0].zones.push(zone('tstfpz1c', 'TFZ1C', 40)); },
    'تعديلُ مصلى': (v) => { v.floors[0].zones[0].name = TAG + ' تعديل'; },
    'حذفُ الطابق': (v) => { v.floors = []; },
  };
  for (const [nm, edit] of Object.entries(EDITS)) await t.test('بعد الأولى · ' + nm, async () => { const v = cp(now); edit(v); await denied(W, W.su.ck, v, now, 'بعد الأولى · ' + nm); });
});

test('(و/f) enfPlanEmpty = «لا موقعَ ولا عنصرَ يراه مستخرِجُ محرّك النطاق» (floors · months[k] بشكليها · مرآةُ الجذر)', since(163), async () => {
  const { enfPlanEmpty } = await internals(['enfPlanEmpty']);
  const F = floor('tstfm1', 7);
  const EMPTY = {
    'null': null, 'undefined': undefined, '{}': {}, 'floors: []': { floors: [] }, 'هيكلٌ فارغ': SKELETON,
    'شهرٌ بلا d': { floors: [], months: { [MK]: { c: 1 } } }, 'شهرٌ مصفوفةٌ فارغة': { months: { [MK]: [] } }, 'شهرٌ null': { months: { [MK]: null } },
    'cfg · pMig · delMonths وحدها': { floors: [], cfg: { x: 1 }, pMig: 2, delMonths: { [MK]: 1 } }, 'مرآةٌ ليست مصفوفات': { floors: [], zones: {}, gates: 'x' },
  };
  const NOT_EMPTY = {
    'floors: [F]': { floors: [F] }, 'floors: [null] (موقع #0)': { floors: [null] },
    'months[k] = [F]': { floors: [], months: { [MK]: [F] } }, 'months[k] = {c, d:[F]}': { floors: [], months: { [MK]: { c: 1, d: [F] } } },
    'months[k] = {d:[طابقٍ بلا هوية]}': { months: { [MK]: { d: [{ zones: [] }] } } },
    'مرآة zones': { floors: [], zones: [zone('tstrz1', 'TRZ1', 0)] }, 'مرآة gates': { floors: [], gates: [gate('tstrg1', 'TRG1', 1)] },
    'مرآة marks': { floors: [], marks: [mark('tstrm1', 'TRM1', 1)] }, 'مرآة paths': { floors: [], paths: [pth('tstrp1', 'TRP1', 1)] },
  };
  const bad = Object.keys(EMPTY).filter(nm => enfPlanEmpty(EMPTY[nm]) !== true).map(nm => 'عُدّت قائمة: ' + nm)
    .concat(Object.keys(NOT_EMPTY).filter(nm => enfPlanEmpty(NOT_EMPTY[nm]) !== false).map(nm => 'عُدّت فارغة: ' + nm));
  assert.deepEqual(bad, [], 'أشكالٌ خالف فيها enfPlanEmpty ما يراه المحرّك');
});
