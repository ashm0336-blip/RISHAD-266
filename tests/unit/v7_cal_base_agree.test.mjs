/* V7 · 53 تقويم — تقويمُ الواجهة (385: KIVO.BassamCal: g· h· fmt·) وتقويمُ الخادم (016: cal*) وكتلةُ PF-CORE (pfDayAt) تعطي الناتجَ نفسَه — TEST_ONLY.
   ① كلُّ يومٍ من 2017 إلى 2039: المفتاح · يومُ الأسبوع · الحرف · الهجريُّ المقابل · النصوص (يوم · طباعة) · الجمع والطرح، والهجريُّ يطابق Intl مستقلاً.
   ② كلُّ شهر: الطول · الأيام · المدى الهجري · الأشهرُ الهجرية الداخلة · النصّ · التنقّل.
   ③ اليومُ التشغيلي (ق11) حول منتصف ليل الرياض وحول الثالثة فجراً: gToday = calToday = UTC(الآن)، وgAt = calGAt = pfDayAt.
   ④ الواجهةُ لا تتأثر بمنطقة الجهاز: الناتجُ نفسُه في الرياض · UTC · لوس أنجلوس · كيريتيماتي (عمليات فرعية بـTZ).
   ⑤ المفاتيح: التمييزُ بالسنة · القبول والرفض · الحروفُ والأسماء وحالتا الكرت. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadServerCal, loadClientCal } from './cal_fx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const S = loadServerCal(), C = loadClientCal();
const J = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const F = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
const PF = (() => {
  const t = fs.readFileSync(path.join(ROOT, 'src/services/535-profile-facts.js'), 'utf8'), a = t.indexOf('/* ══ PF-CORE:BEGIN'), b = t.indexOf('/* ══ PF-CORE:END ══ */');
  const w = fs.readFileSync(path.join(ROOT, 'src/slots/workers/parts/062b-me-history.js.tpl'), 'utf8');
  assert.equal(w.slice(w.indexOf('/* ══ PF-CORE:BEGIN'), w.indexOf('/* ══ PF-CORE:END ══ */')), t.slice(a, b), 'PF-CORE identical in 535 and 062b.tpl');
  const X = { Intl, Date, Math }; vm.createContext(X); vm.runInContext(t.slice(a, b), X); return X;
})();
const from = Date.UTC(2017, 0, 1), to = Date.UTC(2039, 11, 31);
/* V7 · 53 S3: the server's display-only helpers (calGWeekday · CAL_DAY_LETTERS · calGDayText · calPrintLine · calHRangeOfMonth · calGAddMonths · calGMk ·
   CAL_H_MONTHS) had no caller and were removed; the client results are checked against the same rule built here from the LIVE server functions */
const HM = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'], LETTERS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
const sDay = (k) => { const p = S.calGParse(k); return p.d + ' ' + S.CAL_G_MONTHS[p.m - 1] + ' ' + p.y; };
const sPrint = (k) => { const h = S.calHOf(k); return sDay(k) + ' · الموافق ' + h.d + ' ' + HM[h.m - 1] + ' ' + h.y; };
const sRange = (ym) => { const L = S.calGDays(ym), a = S.calHOf(L[0]), b = S.calHOf(L[L.length - 1]);
  if (a.y === b.y && a.m === b.m) return a.d + ' – ' + b.d + ' ' + HM[a.m - 1] + ' ' + a.y;
  if (a.y === b.y) return a.d + ' ' + HM[a.m - 1] + ' – ' + b.d + ' ' + HM[b.m - 1] + ' ' + a.y;
  return a.d + ' ' + HM[a.m - 1] + ' ' + a.y + ' – ' + b.d + ' ' + HM[b.m - 1] + ' ' + b.y; };
const sAddM = (ym, n) => { const p = S.calGParse(ym), i = p.y * 12 + p.m - 1 + n; return S.calGYm(Math.floor(i / 12), (i % 12) + 1); };

test('① every day 2017–2039: client = server, Hijri = Intl Umm al-Qura', () => {
  let n = 0;
  for (let t = from; t <= to; t += 864e5) {
    const x = new Date(t), k = x.toISOString().slice(0, 10);
    const o = {}; F.formatToParts(new Date(t + 12 * 36e5)).forEach((p) => (o[p.type] = +p.value));
    const h = { y: o.year, m: o.month, d: o.day };
    assert.deepEqual(J(C.hOf(k)), h, k); assert.deepEqual(J(S.calHOf(k)), h, k);
    assert.deepEqual(J(C.gParse(k)), J(S.calGParse(k)));
    assert.equal(C.gWeekday(k), x.getUTCDay()); assert.equal(S.calGOfUTC(t).wd, x.getUTCDay());
    assert.equal(C.gLetter(k), LETTERS[x.getUTCDay()]);
    assert.equal(C.hLine(k), h.d + '/' + h.m);
    assert.equal(C.fmtDay(k), sDay(k)); assert.equal(C.fmtPrint(k), sPrint(k));
    assert.equal(C.gAddDays(k, 1), S.calGAddDays(k, 1)); assert.equal(C.gAddDays(k, -31), S.calGAddDays(k, -31));
    assert.equal(C.gAddDays(k, 1), new Date(t + 864e5).toISOString().slice(0, 10));
    assert.ok(C.isGKey(k, 'day') && S.calIsGKey(k, 'day') && C.keyCal(k) === 'g');
    assert.equal(C.gDayNum(k), S.calGDayNum(k));
    if (h.d === 1 || n % 97 === 0) assert.equal(S.calHDay(h.y, h.m, h.d), k);
    n++;
  }
  assert.ok(n > 8000);
});

test('② every month 2017–2039: length · days · Hijri span · text · navigation agree', () => {
  for (let y = 2017; y <= 2039; y++) for (let m = 1; m <= 12; m++) {
    const ym = C.gYm(y, m);
    assert.equal(ym, S.calGYm(y, m));
    assert.equal(C.gMonthDays(y, m), new Date(Date.UTC(y, m, 0)).getUTCDate()); assert.equal(C.gMonthDays(ym), S.calGMonthDays(ym));
    assert.deepEqual(J(C.gDays(ym)), J(S.calGDays(ym)));
    assert.equal(C.hRangeOfMonth(ym), sRange(ym)); assert.ok(C.hRangeOfMonth(ym).length > 8);
    assert.deepEqual(J(C.hMonthsOf(ym)), J(S.calHMonthsOf(ym)));
    assert.equal(C.fmtMonth(ym), S.calGMonthText(ym)); assert.equal(C.fmtMonth(ym), S.CAL_G_MONTHS[m - 1] + ' ' + y);
    assert.equal(C.gNextMonth(ym), sAddM(ym, 1)); assert.equal(C.gPrevMonth(ym), sAddM(ym, -1));
    assert.equal(C.gMk(ym), 'm:' + ym); assert.equal(C.gMk(y, m), 'm:' + ym);
    assert.deepEqual(J(C.gMonthRange(ym)), { from: ym + '-01', to: S.calGDays(ym).slice(-1)[0], days: S.calGMonthDays(ym) });
  }
  assert.equal(C.hRangeOfMonth('2026-11'), '21 جمادى الأولى – 20 جمادى الآخرة 1448');
  assert.equal(C.hRangeOfYear(2026), '1447 – 1448 هـ');
  assert.equal(C.fmtPrint('2026-11-24'), '24 نوفمبر 2026 · الموافق 14 جمادى الآخرة 1448');
});

test('③ operational day with the 3-hour grace (ق11) and the civil day: client = server = PF-CORE', () => {
  for (let t = Date.UTC(2026, 10, 1); t < Date.UTC(2026, 11, 3); t += 15 * 6e4) {
    const op = C.gToday(t);
    assert.deepEqual(J(op), J(S.calToday(t)));
    assert.equal(op.k, new Date(t).toISOString().slice(0, 10), 'op day = UTC date of now');
    assert.equal(op.key, op.k);
    const civ = C.gAt(t), pf = PF.pfDayAt(t);
    assert.deepEqual(J(civ), J(S.calGAt(t)));
    assert.equal(pf.dk, civ.k); assert.equal(pf.ym, civ.ym); assert.equal(pf.wd, PF.PF_WD[civ.wd]);
    const ph = PF.pfHijriAt(t); assert.deepEqual(J(pf.h), { y: ph.y, m: ph.m, d: ph.d });
  }
  /* 02:59 الرياض يومُ أمس تشغيلياً، و03:00 اليومُ نفسُه */
  assert.equal(C.gToday(Date.parse('2026-11-24T23:59:00Z')).k, '2026-11-24');
  assert.equal(C.gToday(Date.parse('2026-11-25T00:00:00Z')).k, '2026-11-25');
  assert.equal(C.gAt(Date.parse('2026-11-24T21:00:00Z')).k, '2026-11-25');
  assert.deepEqual(J(PF.pfGregMonthDays('2026-11')).length, 30);
  assert.equal(PF.pfGregMonthDays('2026-11')[23].wd, 'الثلاثاء');
});

test('④ the client does not depend on the device time zone', () => {
  const script = `
    const fs=require('fs'),vm=require('vm');const W={KIVO:{},Intl,Date,Math,Object,JSON,Error};vm.createContext(W);
    vm.runInContext(fs.readFileSync('src/i18n/380-hijri-fallback.js','utf8'),W);vm.runInContext(fs.readFileSync('src/i18n/385-calendar.js','utf8'),W);
    const C=W.KIVO.BassamCal,out=[];
    for(let t=Date.UTC(2026,0,1);t<Date.UTC(2028,0,1);t+=864e5*3+3600e3*5){const k=C.gToday(t).k;out.push(k,C.gAt(t).k,JSON.stringify(C.hOf(k)),C.hRangeOfMonth(C.gMonthOf(k)),C.gLetter(k));}
    process.stdout.write(require('crypto').createHash('sha256').update(out.join('|')).digest('hex'));`;
  const hashes = ['Asia/Riyadh', 'UTC', 'America/Los_Angeles', 'Pacific/Kiritimati'].map((TZ) => execFileSync(process.execPath, ['-e', script], { cwd: ROOT, env: { ...process.env, TZ } }).toString());
  assert.equal(new Set(hashes).size, 1, JSON.stringify(hashes));
});

test('⑤ keys: format detection by year, strict ISO, names, letters, card states', () => {
  const cases = [['1448-6-14', 'h'], ['1448-06-14-r2', 'h'], ['m:1448-6', 'h'], ['1448-6', 'h'], ['2026-11-24', 'g'], ['2026-11-24-x', 'g'], ['m:2026-11', 'g'], ['2026-11', 'g'],
    ['1899-01-01', null], ['2200-01-01', null], ['1600-1-1', null], ['2026-13', null], ['2026-02-29', null], ['2028-02-29', 'g'], ['m:2026-11-01', null], ['abc', null], ['', null]];
  for (const [k, cal] of cases) { assert.equal(C.keyCal(k), cal, k); assert.equal(S.calKeyCal(k), cal, k); }
  for (const [k, kind, ok] of [['2026-11-24', 'day', true], ['2026-11-4', 'day', false], ['2026-11-24-r', 'day', true], ['2026-11', 'month', true], ['2026-1', 'month', false], ['m:2026-11', 'mctl', true], ['m:2026-11', 'month', false], ['1448-06-14', 'day', false]]) {
    assert.equal(C.isGKey(k, kind), ok, k); assert.equal(S.calIsGKey(k, kind), ok, k);
  }
  assert.equal(S.calGregOk(2026, 11, 24), true); assert.equal(S.calGregOk(2026, 11, 31), false); assert.equal(S.calGregOk(1448, 6, 14), false);
  assert.equal(S.calGregOk(2026, 11, 0), false); assert.equal(S.calGregOk(2026, 11, 0, true), true); assert.equal(S.calGregOk(2026, 11, 1.5), false);
  assert.deepEqual([...C.DAY_LETTERS], ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']); assert.deepEqual([...C.G_MONTHS], [...S.CAL_G_MONTHS]); assert.deepEqual([...C.H_MONTHS], HM);
  assert.equal(C.gLetter('2026-11-24'), 'ث'); assert.equal(C.gLetter('2026-11-27'), 'ج');
  assert.equal(C.fileTag('2026-11'), '2026-11'); assert.equal(C.fmtDayLong('2026-11-24'), 'الثلاثاء 24 نوفمبر 2026');
  assert.equal(C.monthOptions(2026).length, 12); assert.equal(C.monthOptions(2026)[10].sub, C.hRangeOfMonth('2026-11'));
  assert.deepEqual(J(C.yearOptions(2026, 2027)), [{ v: 2026, t: '2026', sub: '1447 – 1448 هـ' }, { v: 2027, t: '2027', sub: C.hRangeOfYear(2027) }]);
  /* التلميح (day_card_design.md): «الأحد 1 نوفمبر 2026 م» · «21 جمادى الأولى 1448 هـ» · الحالة بسببها الإداري */
  const tip = (o) => C.cardState(Object.assign({ T: '2026-11-24' }, o)).tip;
  assert.equal(tip({ k: '2026-11-01', closed: true, why: 'past' }), 'الأحد 1 نوفمبر 2026 م\n21 جمادى الأولى 1448 هـ\nمغلق — أُغلق تلقائياً بلا اعتماد');
  assert.equal(tip({ k: '2026-11-24', closed: true, why: 'ap' }), 'الثلاثاء 24 نوفمبر 2026 م\n14 جمادى الآخرة 1448 هـ\nمغلق — اعتُمد');
  assert.match(tip({ k: '2026-11-20', closed: true, why: 'gone' }), /\nمغلق — مضى$/);
  assert.match(tip({ k: '2026-11-20', closed: true, why: 'shut' }), /\nمغلق — أُغلق يدوياً$/);
  assert.match(tip({ k: '2026-11-17', until: '30 نوفمبر' }), /\nمفتوح — للاستدراك حتى 30 نوفمبر$/);
  assert.match(tip({ k: '2026-11-27' }), /\nمفتوح — قادم$/);
  assert.match(tip({ k: '2026-11-24' }), /\nمفتوح$/);
  assert.equal(tip({ k: '2026-11' }), 'نوفمبر 2026 م\n21 جمادى الأولى – 20 جمادى الآخرة 1448 هـ\nمفتوح');
  assert.equal(tip({ k: '2026', closed: true, why: 'ap' }), '2026 م\n1447 – 1448 هـ\nمغلق — اعتُمد');
  assert.equal(C.cardState({ k: '2026-11-24', closed: true, why: 'zzz', T: '2026-11-24' }).label, 'مغلق');
  assert.equal(C.cardState({ k: '2026-11-27', why: 'ap', T: '2026-11-24' }).why, '', 'an open card carries no closing reason');
  for (const [k, w] of [['2026-11-23', 'past'], ['2026-11-24', 'now'], ['2026-11-25', 'future'], ['2026-10', 'past'], ['2026-11', 'now'], ['2027', 'future']]) assert.equal(C.cardState({ k, T: '2026-11-24' }).when, w, k);
});
