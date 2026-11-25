/* V7 · 53 تقويم (cal-rest · ف٨ العرض العام) — الميلادي أساساً والهجري سطرٌ صغير، في نصوص المنصة المشتركة (TEST_ONLY):
   ① التنبيهات (441 monLbl/dayLbl · 442 todayKey/wdName) ② سجلُّ الحركة (290: التاريخ ميلادي ثم الهجري · «قبل التحويل» للسطر القديم · ق9)
   ③ الطباعة (566: سطرُ التاريخ وسنةُ الغلاف) ④ أسماءُ ملفات التنزيل ميلادية. كلُّ نصٍّ يُقرأ من الملف الحقيقي المولَّد ويُشغَّل بخدمة التقويم الحقيقية. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadClientCal } from './cal_fx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NOV24 = Date.parse('2026-11-24T09:00:00Z');   // الثلاثاء 24 نوفمبر 2026 = 14 جمادى الآخرة 1448 (الرياض)
function slice(src, from, to) { const a = src.indexOf(from); assert.ok(a >= 0, 'missing ' + from); const b = src.indexOf(to, a + from.length); assert.ok(b > a, 'missing end of ' + from); return src.slice(a, b); }
function fixedDate(now) {
  const RealDate = Date;
  return class extends RealDate { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
}

test('① notifications: a Gregorian month/day key reads as its Gregorian name; an old Hijri key stays as written', () => {
  const C = loadClientCal(), src = read('src/services/441-notif-core.js'), ctx = { KIVO: { BassamCal: C } };
  vm.runInNewContext(slice(src, 'var HMON', '\n') + '\n' + slice(src, 'function dayLbl', '\n') + '\n' + slice(src, 'function monLbl', '\n') + '\nthis.monLbl=monLbl;this.dayLbl=dayLbl;', ctx);
  assert.equal(ctx.monLbl('2026-11'), 'نوفمبر 2026');
  assert.equal(ctx.monLbl('2026-1'), 'يناير 2026', 'an unpadded Gregorian month still reads Gregorian');
  assert.equal(ctx.monLbl('1448-6'), 'جمادى الآخرة 1448 هـ', 'ق9: a Hijri month written before the cutover keeps its Hijri name');
  assert.equal(ctx.dayLbl('2026-11-24'), '24 نوفمبر 2026');
  assert.equal(ctx.dayLbl('1448-6-14'), '1448/6/14');
});

test('① notifications: the observer day is the Riyadh Gregorian day and its weekday is Gregorian', () => {
  const C = loadClientCal(), src = read('src/services/442-notif-observer.js'), ctx = { KIVO: { BassamCal: C }, Date: fixedDate(NOV24) };
  vm.runInNewContext(slice(src, 'var WD = ', '\n') + '\n' + slice(src, 'function wdName', '  function isRestOn') + '\n' + slice(src, 'function todayKey', '\n') + '\nthis.T=todayKey();this.wd=wdName;', ctx);
  assert.deepEqual({ ...ctx.T }, { y: 2026, m: 11, d: 24, key: '2026-11-24', ym: '2026-11' });
  assert.equal(ctx.wd('2026-11-24'), 'الثلاثاء');
  assert.equal(ctx.wd('2026-11-27'), 'الجمعة');
});

test('② activity log: Gregorian date first with the small Hijri line; an old Hijri row is shown as written with «قبل التحويل»', () => {
  const C = loadClientCal(), ctx = { KIVO: { BassamCal: C, BassamCount: (n, w) => n + ' ' + w }, Date: fixedDate(NOV24) };
  vm.runInNewContext(read('src/services/290-activity-log.js'), ctx);
  const L = ctx.KIVO.BassamAudit;
  assert.equal(L.dateTxt(NOV24), '24 نوفمبر 2026');
  assert.equal(L.hdateTxt(NOV24), '14 جمادى الآخرة 1448 هـ');
  assert.equal(L.dLabel('2026-11-24'), 'يوم 24 نوفمبر 2026');
  assert.equal(L.mLabel('2026-11'), 'نوفمبر 2026');
  assert.equal(L.dLabel('1448-5-16'), 'يوم 16 جمادى الأولى 1448 هـ (قبل التحويل)');
  const fresh = L.rowVM({ id: 1, ts: NOV24, act: 'edited', etype: 'round', ctx: JSON.stringify({ day: '2026-11-24' }) });
  assert.equal(fresh.date, '24 نوفمبر 2026'); assert.equal(fresh.hdate, '14 جمادى الآخرة 1448 هـ'); assert.equal(fresh.pre, false);
  const old = L.rowVM({ id: 2, ts: NOV24 - 30 * 864e5, act: 'edited', etype: 'round', ctx: JSON.stringify({ day: '1448-5-16' }), ename: 'round.edit 1448-5-16' });
  assert.equal(old.pre, true, 'ق9: the row written before the cutover is marked');
  assert.match(old.ctx, /1448/, 'ق9: its text is kept as written (not rewritten)');
});

test('③ print: the PDF date line is Gregorian with «الموافق» Hijri, and the report cover year is Gregorian', () => {
  const C = loadClientCal({ Date: fixedDate(NOV24) }), src = read('src/systems/_shared/print/566-print-core.js');   /* V7 · 53: «اليوم» من الساعة الثابتة (كان التقويم يقرأ ساعة الجهاز فيفشل بعد 24 نوفمبر) */
  const block = slice(src, '    if (O.date === "today")', '\n\n');
  const line = (O, s) => { const ctx = { KIVO: { BassamCal: C }, O, s, o: '', Date: fixedDate(NOV24) }; vm.runInNewContext(block, ctx); return ctx.o; };
  assert.equal(line({ date: 'round' }, { year: 2026, month: 11, day: 24 }), 'جولة يوم 24 نوفمبر 2026 · الموافق 14 جمادى الآخرة 1448');
  assert.equal(line({ date: 'round' }, { year: 2026, month: 2, day: 31 }), 'جولة يوم 28 فبراير 2026 · الموافق 11 رمضان 1447', 'the day is clamped to the Gregorian month');
  assert.equal(line({ date: 'today' }, {}), '24 نوفمبر 2026 · الموافق 14 جمادى الآخرة 1448');
  const cover = slice(src, '  function coverInfo(dateLine, dept) {', '\n  function pdfDownload');
  const ctx = { KIVO: { BassamCal: C, BassamDepts: { activeGroupName: () => 'TEST_ONLY' } }, Date: fixedDate(NOV24) };
  vm.runInNewContext(cover + '\nthis.a=coverInfo("جولة يوم 24 نوفمبر 2025 · الموافق 3 جمادى الآخرة 1447","d");this.b=coverInfo("","d");', ctx);
  assert.equal(ctx.a.year, '2025', 'the Gregorian year of the report day, not the Hijri «الموافق»');
  assert.equal(ctx.b.year, '2026');
  assert.match(slice(src, 'const sub = "لتحديث الخطة التشغيلية"', ';'), /"م"/, 'the cover line reads «لعام …م»');
});

test('④ download file names are Gregorian (YYYY-MM), not a Hijri month name', () => {
  const ir = read('src/systems/irshad/client/logic.js');
  assert.match(ir, /"irshad-" \+ KIVO\.BassamCal\.fileTag\(KIVO\.BassamCal\.gYm\(r, a\)\) \+ "\.xlsx"/);
  const C = loadClientCal();
  assert.equal('irshad-' + C.fileTag(C.gYm(2026, 11)) + '.xlsx', 'irshad-2026-11.xlsx');
});
