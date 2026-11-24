/* V7 · 53 تقويم (cal-import · REVIEW 23 · 28): كاشفُ التاريخ في الاستيراد (548-import-kit dateIn = calDateInCore) — قيمةً قيمة، ملفوفٌ حول المحوّل الواحد.
   ① الصيغ: yyyy-mm-dd · dd/mm/yyyy · d/m/yyyy · yyyymmdd · رقمُ Excel وخليتُه · الأرقامُ العربية · أسماءُ الأشهر الهجرية والميلادية · «هـ»/«م» · الخليط · والملتبسُ بسببه.
   ② محرّكٌ واحد: تحويلُ الواجهة (مرآةُ calConvDay بأم القرى) = calConvDay في الخادم (019v) لكل يومٍ هجري 1318–1599 (ويومٌ لا وجود له يُرفض في الاثنين).
   ③ نسخةُ الإدارة/ملفُّ Production: «كما في الملف ← كما سيُحفظ» لكل مفتاحٍ هجري · الخليطُ مقبول · يومٌ لا وجود له يوقف الرفع قبل أي طلب برسالةٍ تسمّي موضعه وسببه. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './harness.mjs';
import { loadServerCal } from './cal_fx.mjs';

const SRC = process.env.KIVO_SRC || path.join(ROOT, 'src');
function kit(extra = {}) {
  const C = vm.createContext({ KIVO: {}, Intl, Date, Math, Object, JSON, Error, console, window: { addEventListener() {} }, ...extra });
  for (const f of ['i18n/380-hijri-fallback.js', 'i18n/385-calendar.js', 'services/548-atomic-backup.js', 'services/548-import-kit.js']) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), C);
  let k = null; C.KIVO.BackupRestore.kit().then((x) => { k = x; });
  return new Promise((r) => setImmediate(r)).then(() => { assert.ok(k, 'الأداةُ مسجّلة'); return { K: k, C }; });
}
const S = loadServerCal(), conv = (k) => { try { return S.calConvDay(k, 'TEST_ONLY'); } catch (e) { return null; } };

test('① الصيغُ كلُّها قيمةً قيمة: الهجريُّ يُحوَّل · الميلاديُّ كما هو · الملتبسُ والمستحيلُ مرفوضٌ بسببه بالعربي', async () => {
  const { K } = await kit(), g = conv('1448-6-14');
  assert.equal(g, '2026-11-24', 'مرجعُ أم القرى (cal_api.md)');
  const ok = { '2026-11-24': 'g', '24/11/2026': 'g', '4/1/2026': 'g', '20261124': 'g', '٢٤/١١/٢٠٢٦': 'g', '24 نوفمبر 2026 م': 'g', 'Nov 24, 2026': 'g', '24 تشرين الثاني 2026': 'g', '46350': 'g', 'الثلاثاء 24/11/2026 10:30': 'g',
    '1448-06-14': 'h', '1448-6-14': 'h', '14/6/1448': 'h', '14/06/1448 هـ': 'h', '١٤٤٨/٠٦/١٤': 'h', '14 جمادى الآخرة 1448': 'h', '14 جمادى الثانية 1448هـ': 'h', '۱۴/۶/۱۴۴۸': 'h' };
  for (const [v, cal] of Object.entries(ok)) {
    const r = K.dateIn(v); assert.equal(r.ok, 1, v + ': ' + JSON.stringify(r)); assert.equal(r.cal, cal, v);
    assert.equal(r.k, v === '4/1/2026' ? '2026-01-04' : '2026-11-24', v + ' ⇐ ' + r.k);
  }
  assert.equal(K.dateIn({ k: 'i', n: 46350, s: '46350' }).k, '2026-11-24', 'رقمُ Excel في خليةٍ رقمية'); assert.equal(K.dateIn({ k: 'd', s: '2026-11-24' }).k, '2026-11-24', 'خليةُ تاريخ Excel');
  assert.equal(K.dateIn(46350).k, '2026-11-24');
  const bad = { '05/13/2026': /ملتبس/, '1/2/26': /بخانتين/, '30/6/1448': /اليوم 30 غير موجود في جمادى الآخرة 1448 هـ/, '31/2/2026': /اليوم 31 غير موجود في فبراير 2026 \(28 يوماً\)/,
    '2026-11-24 هـ': /ميلادية واللاحقةُ «هـ» هجرية/, '14 نوفمبر 1448': /«نوفمبر» ميلادي والسنة 1448 هجرية/, '1750-01-01': /خارج المدى/, '14 فلان 1448': /اسمُ الشهر/, 'غدا': /صيغةُ تاريخ غير معروفة/, '2026-13-01': /الشهر 13/ };
  for (const [v, rx] of Object.entries(bad)) { const r = K.dateIn(v); assert.equal(r.ok, 0, v); assert.match(r.why, rx, v + ': ' + r.why); assert.equal(r.from, v, 'القيمةُ كما في الملف'); }
  assert.equal(JSON.stringify(K.dateIn('  ')), JSON.stringify({ ok: 0, empty: 1, from: '  ' }), 'الفارغُ فارغٌ لا خطأ');
});

test('② محرّكٌ واحد: تحويلُ الواجهة = calConvDay في الخادم لكل يومٍ هجري 1318–1599 (والمستحيلُ مرفوضٌ في الاثنين)', { timeout: 600000 }, async () => {
  const { K } = await kit();
  let n = 0, none = 0;
  for (let y = 1318; y <= 1599; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= 30; d++) {
    const k = y + '-' + m + '-' + d, s = conv(k), c = K.dateIn(k);
    if (s === null && y >= 1320 && y <= 1590) { assert.equal(c.ok, 0, k + ': الخادم يرفضه فالواجهةُ ترفضه'); none++; continue; }
    if (s === null || !/^(19|20|21)/.test(s)) continue;
    assert.equal(c.ok ? c.k : null, s, k); n++;
  }
  assert.ok(n > 98000 && none > 1000, n + ' يوماً متطابقاً · ' + none + ' يوماً لا وجود له');
});

test('③ النسخة/ملفُّ Production: كما في الملف ← كما سيُحفظ · الخليطُ مقبول · يومٌ لا وجود له يوقف الرفع قبل أي طلب', async () => {
  const sent = [], { K, C } = await kit({ fetch: async (u) => { sent.push(u); throw new Error('TEST_ONLY'); } });
  const file = { app: 'bassam-crowd', version: 3, kind: 'dept', dept: 'TEST_ONLY', perms: null, idbImages: {}, data: {
    bassam_rounds_v1: JSON.stringify({ __pMig: 2, 'm:1448-6': { mo: 1 }, '1448-6-14': {}, '1448-6-14-r2': {}, '2026-11-25': {} }),
    bassam_staffing_v3: JSON.stringify({ '1448-6': {} }), bassam_custody_v1: JSON.stringify({ items: [], moves: [{ y: 1448, m: 6, d: 0 }] }), bassam_options_v1: '{}' } };
  const fd = K.fileDates(file);
  assert.equal(fd.bad.length, 0); assert.equal(fd.days, 2); assert.equal(fd.months, 2); assert.equal(fd.values, 1);
  const pairs = Object.fromEntries(fd.conv.map((x) => [x.from, x.to]));
  assert.equal(pairs['1448-6-14'], '2026-11-24'); assert.equal(pairs['1448-6-14-r2'], '2026-11-24-r2', 'لاحقةُ الجولات تبقى'); assert.equal(pairs['m:1448-6'], 'm:2026-11 و2026-12');
  assert.match(K.dateLine(fd), /كما في الملف ← كما سيُحفظ: .*1448-6-14 ← 2026-11-24/);
  assert.equal(pairs['2026-11-25'], undefined, 'الميلاديُّ في الملف نفسِه لا يُحوَّل (الخليطُ مقبول)');
  file.data.bassam_tasks_v1 = JSON.stringify({ '1448-6-30': [] });
  const bad = K.fileDates(file); assert.equal(bad.bad.length, 1); assert.equal(bad.bad[0].at, 'bassam_tasks_v1 › 1448-6-30');
  C.window.__BS_BOOT = { srv: 1, cf: 1, uid: 'TEST_ONLY_s' }; C.KIVO.BassamAuth = { user: () => ({ id: 'TEST_ONLY_s', role: 'super' }) }; C.window.crypto = { getRandomValues: (b) => b };
  const steps = [], r = await K.prepare(file, { mode: 'replace', scope: { kind: 'dept', departmentId: 'TEST_ONLY_A' }, onProgress: (p) => steps.push(p.step) });
  assert.equal(r.ok, 0); assert.equal(r.err, 'import-dates');
  assert.match(r.message, /لم يُرفع شيء.*«bassam_tasks_v1 › 1448-6-30» 1448-6-30: اليوم 30 غير موجود في جمادى الآخرة 1448 هـ.*صحّح/);
  assert.deepEqual(sent, [], 'لا طلبَ قبل التصحيح'); assert.deepEqual([...new Set(steps)], ['check'], 'مرحلةُ «فحص التواريخ» ظاهرة');
});
