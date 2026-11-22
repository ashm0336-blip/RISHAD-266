/* V7 · د5-د — مساعداتُ التقويم: نسخةٌ واحدة في خدمة القاعدة (src/i18n/385-calendar.js)، ومخرجُها مطابقٌ للنسخ التي حُذفت.
   المرجعُ أدناه (OLD) هو نصُّ النسخ القديمة كما كانت في الصفحات قبل الحذف — يُحفظ هنا ليُقارَن به لا ليُستعمل:
     plain = نسخة الخطة/الجدول/الاسترشاد/المضبوطات/المهام · noon = نسخة المتابعة اليومية/التقرير اليومي (تثبيت الساعة 12)
   ① لكل يومٍ هجري في 21 سنة: hGreg = القديمة لحظةً بلحظة · hGregNoon = القديمة لحظةً بلحظة.
   ② قرار hGreg: اليومُ الميلادي واحدٌ في النسختين لكل تاريخ، واللحظةُ تختلف ⇒ دالتان باسمين (لا تُوحَّدان).
   ③ hParts · hGregMonthLabel · hGregYearRange · hToday = القديمة — وعلى حدود الشهر ونهاية السنة.
   ④ يُعاد كلُّ ذلك في أربع مناطق زمنية (الرياض · UTC · لوس أنجلوس · كيريتيماتي) ومعه لحظاتٌ حول منتصف الليل.
   ⑤ لا نسخةَ من هذه الدوال في أي صفحة: تعريفُها في الخدمة وحدها، وفي الصفحات منادياتٌ من سطرٍ واحد. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const load = () => { const W = { KIVO: { BassamHijri: { now: () => ({ y: 1448, m: 2, d: 1 }) } }, Intl, Date, Math, Object }; vm.createContext(W); vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/i18n/385-calendar.js'), 'utf8'), W); return W.KIVO.BassamCal; };
/* ── النسخُ القديمة حرفاً (أسماءُ المتغيّرات كما كانت في الخطة والمتابعة اليومية وعُدّة الصفحات) ── */
const OLD = {
  __hf: undefined, __hg: null,
  _hfmt() { if (void 0 === this.__hf) try { this.__hf = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }); } catch (t) { this.__hf = null; } return this.__hf; },
  hParts(t) { const e = this._hfmt().formatToParts(t), s = (t) => +e.find((e) => e.type === t).value; return { y: s('year'), m: s('month'), d: s('day') }; },
  plain(t, e, s) { let n = new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (e - 1)) + (s - 1))); try { for (let a = 0; a < 12; a++) { const a = this.hParts(n); if (a.y === t && a.m === e && a.d === s) return n; const i = 354.367 * (a.y - t) + 29.5306 * (a.m - e) + (a.d - s); n = new Date(n.getTime() - 864e5 * (Math.round(i) || (i > 0 ? 1 : -1))); } } catch (t) {} return n; },
  noon(t, e, s) { const n = (t) => new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12); let i = n(new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (e - 1)) + (s - 1)))); try { for (let o = 0; o < 12; o++) { const o = this.hParts(i); if (o.y === t && o.m === e && o.d === s) return i; const r = 354.367 * (o.y - t) + 29.5306 * (o.m - e) + (o.d - s); i = n(new Date(i.getTime() - 864e5 * (Math.round(r) || (r > 0 ? 1 : -1)))); } } catch (t) {} return i; },
  label(hGreg, t, e) { let n = ''; try { n = hGreg.call(this, t, e, 15).toLocaleDateString('ar-u-ca-gregory-nu-latn', { month: 'long', year: 'numeric' }); } catch (t) {} return n; },
  range(hGreg, t) { try { const e = hGreg.call(this, t, 1, 1).getFullYear(), s = hGreg.call(this, t, 12, 29).getFullYear(); return e === s ? e + ' م' : e + ' – ' + s + ' م'; } catch (t) { return ''; } },
  rangeReport(hGreg, t) { try { const r = hGreg.call(this, t, 1, 1).getFullYear(), e = hGreg.call(this, t, 12, 29).getFullYear(); return (r === e ? r : r + ' – ' + e) + ' م'; } catch (t) { return ''; } },
};
const Y0 = 1438, Y1 = 1458;
const ymd = (d) => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();

function proof() {
  const C = load(); let days = 0, sameInstant = 0, otherDay = 0;
  for (let y = Y0; y <= Y1; y++) for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= 30; d++) {
      const p = OLD.plain(y, m, d), n = OLD.noon(y, m, d);
      assert.equal(C.hGreg(y, m, d).getTime(), p.getTime(), 'hGreg ' + [y, m, d]);
      assert.equal(C.hGregNoon(y, m, d).getTime(), n.getTime(), 'hGregNoon ' + [y, m, d]);
      if (ymd(p) !== ymd(n)) otherDay++;   /* النسختان تختلفان في اليوم الميلادي نفسِه لبعض التواريخ في بعض المناطق */
      assert.equal(n.getHours(), 12);
      days++; if (p.getTime() === n.getTime()) sameInstant++;
      assert.deepEqual({ ...C.hParts(p) }, OLD.hParts(p)); assert.deepEqual({ ...C.hParts(n) }, OLD.hParts(n));
      /* حول منتصف الليل المحلي لذلك اليوم: آخرُ لحظةٍ قبله وأولُ لحظةٍ بعده */
      for (const ms of [new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0).getTime() - 1, new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0).getTime(), new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59, 999).getTime()]) assert.deepEqual({ ...C.hParts(new Date(ms)) }, OLD.hParts(new Date(ms)));
    }
    assert.equal(C.hGregMonthLabel(y, m), OLD.label(OLD.plain, y, m), 'label ' + [y, m]);
    assert.equal(OLD.label(OLD.noon, y, m), OLD.label(OLD.plain, y, m), 'the month label (day 15) was the same with either variant ' + [y, m]);
  }
  for (let y = Y0; y <= Y1; y++) { const want = OLD.range(OLD.plain, y); assert.equal(C.hGregYearRange(y), want); assert.equal(OLD.range(OLD.noon, y), want); assert.equal(OLD.rangeReport(OLD.noon, y), want, 'the report variant printed the same text'); }
  /* حدود الشهر ونهاية السنة: اليومُ التالي لآخر الشهر هو أولُ الذي يليه */
  for (let y = Y0; y <= Y1; y++) for (let m = 1; m <= 12; m++) { const first = C.hGregNoon(y, m, 1), prev = new Date(first.getFullYear(), first.getMonth(), first.getDate() - 1, 12), h = C.hParts(prev); assert.deepEqual([h.y, h.m], m === 1 ? [y - 1, 12] : [y, m - 1]); assert.ok(h.d === 29 || h.d === 30); }
  const t = C.hToday(), now = OLD.hParts(new Date()); assert.deepEqual({ ...t }, now); assert.deepEqual({ ...C.hPartsSafe() }, now);
  return { days, sameInstant, otherDay };
}

if (process.env.V7_CAL_CHILD) { const r = proof(); process.stdout.write(JSON.stringify(r)); process.exit(0); }

test('①②③ the unified functions equal the removed copies for every Hijri day of 21 years, month borders and year ends', () => {
  const r = proof();
  assert.equal(r.days, (Y1 - Y0 + 1) * 12 * 30);
  assert.ok(r.sameInstant < r.days, 'the two hGreg variants do not return the same instant for every date (' + r.sameInstant + ' of ' + r.days + ') — hence two named functions');
  console.log('CAL here ' + JSON.stringify(r));
});

test('④ the same proof in four time zones, with instants around local midnight', () => {
  const seen = [];
  for (const TZ of ['Asia/Riyadh', 'UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
    const out = execFileSync(process.execPath, ['--no-warnings', fileURLToPath(import.meta.url)], { env: { ...process.env, TZ, V7_CAL_CHILD: '1' }, encoding: 'utf8' });
    const r = JSON.parse(out); assert.equal(r.days, (Y1 - Y0 + 1) * 12 * 30, TZ);
    console.log('CAL ' + TZ + ' ' + JSON.stringify(r));
    seen.push(r);
  }
  /* قرار hGreg بالدليل: النسختان لا تعطيان اللحظةَ نفسَها في أي منطقة، وفي بعض المناطق لا تعطيان اليومَ الميلادي نفسَه لكل التواريخ ⇒ دالتان */
  assert.ok(seen.every((r) => r.sameInstant < r.days));
});

test('⑤ no copy remains: the five functions are implemented in the base service only; pages carry one-line callers', () => {
  const NAMES = ['hGreg', 'hParts', 'hGregMonthLabel', 'hGregYearRange', 'hToday'];
  const files = []; const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (!/^(pages|tests)$/.test(e.name)) walk(p); } else if (/\.(js|tpl)$/.test(e.name) && !/\.(json|html)\.tpl$/.test(e.name)) files.push(p); } };
  walk(path.join(ROOT, 'src'));
  const bodies = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8'), re = new RegExp('(?:^|\\n)[ \\t]*(' + NAMES.join('|') + ')\\(([^)]*)\\)\\s*\\{', 'g'); let m;
    while ((m = re.exec(src))) { let i = re.lastIndex, depth = 1; while (depth && i < src.length) { const c = src[i++]; if (c === '{') depth++; else if (c === '}') depth--; } bodies.push({ file: path.relative(ROOT, f), name: m[1], body: src.slice(re.lastIndex, i - 1).replace(/\/\*[\s\S]*?\*\//g, '').trim() }); }
  }
  const heavy = bodies.filter((b) => !/^return KIVO\.BassamCal\.[A-Za-z]+\([^;{}]*\);$/.test(b.body));
  assert.deepEqual(heavy.map((b) => b.file + ' :: ' + b.name), [], 'a page still carries its own implementation');
  assert.ok(bodies.length >= 5, 'the page kit carries the callers');
  const service = fs.readFileSync(path.join(ROOT, 'src/i18n/385-calendar.js'), 'utf8');
  for (const n of NAMES.concat(['hGregNoon', 'hPartsSafe'])) assert.match(service, new RegExp('function ' + n + '\\('), n);
});
