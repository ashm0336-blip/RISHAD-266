/* V7 · 53 تقويم — اختبارُ خاصيةٍ للدالة النقية «هجري ⇐ ميلادي» (workers/parts/019v-calendar-convert.js + 016) على كل يومٍ من 1440 إلى 1460 هـ.
   المرجعُ المستقل: مُنسِّقُ أم القرى (Intl، توقيتُ الرياض) مبنيٌّ هنا في الاختبار، وقاعدةُ القفل مقروءةٌ من 010 (lockedIn) نفسِها لا من نسخة 019v.
   ① تقابلٌ على الأيام: كلُّ يومٍ هجري ⇐ يومٌ ميلادي واحد، متتالٍ، يعود إليه · يوم 30 في شهرٍ من 29 ⇐ null · الميلادي يعود كما هو.
   ② قسمةُ الأشهر: أيامُ الشهر الهجري موزّعةٌ على شهرين ميلاديين بلا فقد · كلُّ شهرٍ ميلادي = مجموعُ أجزائه الهجرية · الأغلبية.
   ③ «السلوكُ اليومي المطابق» (§3.3): لسجلّاتٍ عشوائية ولأيامٍ مرجعية حول كل شهر: قفلُ كل يومٍ بعد التحويل = قبله (بقاعدة 010).
   ④ النطاقات · النوافذ (ق7 · ق10) · المهام المتكررة (ق6) · أقفالُ الأشهر بلا أيام. — TEST_ONLY */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadServerCal } from './cal_fx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const S = loadServerCal();
const F = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
const hijOf = (iso) => { const [y, m, d] = iso.split('-').map(Number), o = {}; F.formatToParts(new Date(Date.UTC(y, m - 1, d, 12))).forEach((p) => (o[p.type] = +p.value)); return { y: o.year, m: o.month, d: o.day }; };
const H0 = 1440, H1 = 1460;
const J = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x))), deq = (a, b, msg) => assert.deepEqual(J(a), J(b), msg);
/* قاعدةُ 010 حرفاً: تُستخرج دالتا normLock وlockedIn من الجزء المولَّد وتُشغَّل في سياقٍ مستقل */
const ORACLE = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'workers/parts/010-kivo-scope-2.js'), 'utf8');
  const a = src.indexOf('function normLock('), b = src.indexOf('function parseDay(');
  assert.ok(a > 0 && b > a, '010: normLock/lockedIn');
  const C = { isObj: (v) => !!v && typeof v === 'object' && !Array.isArray(v) }; vm.createContext(C); vm.runInContext(src.slice(a, b), C);
  return C.lockedIn;
})();
let seed = 20261124; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

test('① every Hijri day 1440–1460 maps to exactly one Gregorian day, consecutively, and back (bijection against Intl Umm al-Qura)', () => {
  const seen = new Set(); let prev = null, n = 0;
  for (let y = H0; y <= H1; y++) for (let m = 1; m <= 12; m++) {
    const len = S.calHMonthLen(y, m);
    assert.ok(len === 29 || len === 30, y + '-' + m + ' length ' + len);
    for (let d = 1; d <= len; d++) {
      const g = S.calHDay(y, m, d);
      assert.ok(S.calIsGKey(g, 'day'), y + '-' + m + '-' + d + ' → ' + g);
      deq(hijOf(g), { y, m, d }, 'Intl disagrees at ' + g);
      assert.equal(S.calHtoGDay(y + '-' + m + '-' + d), g);
      assert.equal(S.calHtoGDay(y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0') + '-r1'), g + '-r1', 'padded + suffix');
      assert.equal(S.calHtoGDay(g), g, 'idempotent');
      deq({ ...S.calHOf(g) }, { y, m, d });
      assert.ok(!seen.has(g), 'two Hijri days on ' + g); seen.add(g);
      if (prev) assert.equal(S.calGAddDays(prev, 1), g, 'gap before ' + g);
      prev = g; n++;
    }
    if (len === 29) { assert.equal(S.calHDay(y, m, 30), null); assert.equal(S.calHtoGDay(y + '-' + m + '-30'), null); }
  }
  /* لا يومَ ميلادي في المدى بلا يومٍ هجري (التقابلُ في الاتجاهين) */
  const ms = (k) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
  assert.equal(n, (ms(prev) - ms(S.calHDay(H0, 1, 1))) / 864e5 + 1);
  assert.ok(n > 7000);
  for (const bad of ['1600-1-1', '1448-13-1', '1448-0-5', 'x', '', null]) assert.equal(S.calHtoGDay(bad), null, String(bad));
});

test('② month splitting: a Hijri month spreads over 1–2 Gregorian months losing nothing; each Gregorian month is the sum of its Hijri parts; majority', () => {
  for (let y = H0; y <= H1; y++) for (let m = 1; m <= 12; m++) {
    const L = S.calGMonthsOfH(y, m), len = S.calHMonthLen(y, m);
    assert.ok(L.length >= 1 && L.length <= 2);
    assert.equal(L.reduce((a, x) => a + x.days, 0), len);
    /* V7 · 53 S3: calHtoGMonth (only caller: the removed calHtoGKey) ⇒ the live month path calHtoGScope gives the same Gregorian months */
    deq(S.calHtoGScope({ y: y, m: m, d: null }).map((x) => S.calGYm(x.y, x.m)), L.map((x) => x.g));
    if (L.length === 2) { const p = S.calGParse(L[0].g), i = p.y * 12 + p.m; assert.equal(S.calGYm(Math.floor(i / 12), (i % 12) + 1), L[1].g); }
  }
  for (let y = 2019; y <= 2038; y++) for (let m = 1; m <= 12; m++) {
    const gm = S.calGYm(y, m), P = S.calHMonthsOfG(gm), mj = S.calMajority(gm);
    assert.equal(P.reduce((a, x) => a + x.days, 0), S.calGMonthDays(y, m), gm);
    assert.equal(P[0].from, gm + '-01'); assert.equal(P[P.length - 1].to, S.calGDays(gm).slice(-1)[0]);
    for (const x of P) { assert.equal(S.calGRange(x.from, x.to).length, x.days); deq({ ...S.calHOf(x.from) }.m, x.m); }
    const max = Math.max(...P.map((x) => x.days));
    assert.equal(mj.days, max); assert.equal(mj.h, P.find((x) => x.days === max).h);
    assert.equal(mj.tie, P.filter((x) => x.days === max).length > 1);
  }
  deq(JSON.parse(JSON.stringify(S.calHtoGScope({ y: 2026, m: 11, d: null }))), [{ y: 2026, m: 11, d: null }]);
  assert.equal(S.calHtoGScope({ y: 1448, m: 13, d: null }), null);
});

const randDays = (p) => { const o = {}; for (let d = 1; d <= 30; d++) if (rnd() < p) o[d] = 1; return o; };
const randRec = () => {
  const r = rnd();
  if (r < 0.15) return undefined;
  if (r < 0.22) return true;
  if (r < 0.27) return 1;
  const o = {};
  if (rnd() < 0.2) o.ap = 1;
  if (rnd() < 0.15) o.auto = 1;
  if (rnd() < 0.35) o.mo = 1;
  if (rnd() < 0.5) o.dopen = randDays(0.25);
  if (rnd() < 0.5) o.dshut = randDays(0.25);
  if (rnd() < 0.1) o.perm = rnd() < 0.5 ? 1 : 2;
  return o;
};
test('③ «same daily behaviour» (§3.3): for random month records and reference days around every Gregorian month 2019–2038, no day changes lock (010 rule)', () => {
  let months = 0, days = 0, stored = 0;
  for (let y = 2019; y <= 2038; y++) for (let m = 1; m <= 12; m++) {
    const gm = S.calGYm(y, m), first = gm + '-01', last = S.calGDays(gm).slice(-1)[0];
    const Ts = [S.calGAddDays(first, -40), S.calGAddDays(first, -1), first, S.calGAddDays(first, 9), S.calGAddDays(first, 14), last, S.calGAddDays(last, 1), S.calGAddDays(last, 35)];
    for (let rep = 0; rep < 3; rep++) {
      const src = {}; for (const p of S.calHMonthsOfG(gm)) src[rnd() < 0.5 ? p.h : 'm:' + p.h] = randRec();
      for (const T of Ts) {
        const out = S.calMonthRule(gm, src, T), Tg = S.calGParse(T), Th = hijOf(T);
        assert.equal(out.ok, true, gm + ' @' + T);
        const rec = out.rec == null ? undefined : JSON.parse(JSON.stringify(out.rec));
        S.calGDays(gm).forEach((k, i) => {
          const h = hijOf(k), hk = h.y + '-' + h.m, raw = src[hk] !== undefined ? src[hk] : src['m:' + hk];
          const before = ORACLE(raw, h.y, h.m, h.d, Th), after = ORACLE(rec, y, m, i + 1, { y: Tg.y, m: Tg.m, d: Tg.d });
          assert.equal(after, before, gm + ' day ' + k + ' (' + hk + '-' + h.d + ') @' + T + ' rec=' + JSON.stringify(rec) + ' src=' + JSON.stringify(raw));
          assert.equal(out.days[i].locked, before); assert.equal(out.days[i].g, k);
          days++;
        });
        if (rec) stored++;
        months++;
      }
    }
  }
  assert.ok(months > 5000 && days > 150000 && stored > 1000, months + ' / ' + days + ' / ' + stored);
});

test('③b month rule shapes: all approved ⇒ {ap}; reason fields from the majority source; nothing needed ⇒ null', () => {
  deq(S.calMonthRule('2026-11', { '1448-5': { ap: 1, auto: 1 }, 'm:1448-6': true }, '2026-11-24').rec, { ap: 1 });
  deq(S.calMonthRule('2026-11', { '1448-5': { ap: 1, auto: 1 }, '1448-6': { ap: 1, auto: 1 } }, '2026-11-24').rec, { ap: 1, auto: 1 });
  const r = S.calMonthRule('2026-11', { '1448-5': { ap: 1 }, '1448-6': { dshut: { 20: 1 }, perm: 2 } }, '2026-11-24');
  deq(JSON.parse(JSON.stringify(r.rec)), { dshut: { 30: 1 }, perm: 2 });
  deq(JSON.parse(JSON.stringify(r.extra)), { perm: [undefined, 2].map((v) => (v === undefined ? null : v)) });
  assert.equal(S.calMonthRule('2026-12', {}, '2026-11-24').rec, null);
  assert.equal(S.calMonthRule('2026-11', {}, '1448-6-14').ok, false);
});

test('④ ranges · windows (ق7 · ق10) · recurring day (ق6) · day-less month locks (ق3)', () => {
  /* V7 · 53 S3: calHtoGRange had no caller ⇒ its two ends on the live day converter, and their order */
  assert.equal(S.calHtoGDay('1448-6-1'), '2026-11-11'); assert.equal(S.calHtoGDay('1448-6-29'), '2026-12-09');
  assert.equal(S.calGCmp(S.calHtoGDay('1448-6-29'), S.calHtoGDay('1448-6-1')), 1);
  deq(JSON.parse(JSON.stringify(S.calHtoGScope({ y: 1448, m: 6, d: null }))), [{ y: 2026, m: 11, d: null }, { y: 2026, m: 12, d: null }]);
  deq(JSON.parse(JSON.stringify(S.calHtoGScope({ y: 1448, m: 5, d: 0 }))), [{ y: 2026, m: 10, d: 0 }]);
  deq(JSON.parse(JSON.stringify(S.calHtoGScope({ y: 1448, m: 6, d: 14 }))), [{ y: 2026, m: 11, d: 24 }]);
  deq(JSON.parse(JSON.stringify(S.calHtoGScope({ y: 2026, m: 11, d: 24 }))), [{ y: 2026, m: 11, d: 24 }]);
  assert.equal(S.calHtoGScope({ y: 1448, m: 6, d: 30 }), null);
  /* ق6: أولُ موعدٍ في T أو بعده، ويومُه الهجري هو المطلوب (أو آخرُ الشهر) */
  for (const T of ['2026-11-24', '2026-12-09', '2027-02-17', '2030-06-01']) for (let md = 1; md <= 30; md++) {
    const gd = S.calHtoGMd(md, T); assert.ok(gd >= 1 && gd <= 31);
    const hT = hijOf(T); let found = null;
    for (let i = 0; i < 70 && !found; i++) { const k = S.calGAddDays(T, i), h = hijOf(k); const len = S.calHMonthLen(h.y, h.m); if (h.d === Math.min(md, len)) found = k; }
    assert.equal(gd, +found.slice(8), md + ' @' + T + ' (' + JSON.stringify(hT) + ')');
  }
  assert.equal(S.calHtoGMd('last', '2026-11-24'), 'last');
  assert.equal(S.calHtoGMd(31, '2026-11-24'), null);
  assert.equal(S.calMonthLockRule('2026-11', { '1448-5': true, '1448-6': true }), true);
  assert.equal(S.calMonthLockRule('2026-11', { '1448-5': true, '1448-6': { mo: 1 } }), undefined);
  deq({ ...S.calMonthLockRule('2026-11', { '1448-5': { mo: 1 }, '1448-6': { mo: 1 } }) }, { mo: 1 });
  assert.equal(S.calMonthLockRule('2026-11', { '1448-5': true }), undefined);
});
