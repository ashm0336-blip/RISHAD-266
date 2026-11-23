/* V7 · د6 — اسمُ يوم الأسبوع ليومٍ هجري (KIVO.BassamCal.hWeekdayIndex · مراقبُ الإشعارات 442) لا يتعلّق بساعة «الآن».
   كان البحثُ يخطو 24 ساعةً من «الآن»: متى كان «الآن» في الساعة الأخيرة قبل منتصف الليل المحلي في منطقةٍ لها توقيتٌ صيفي (لوس أنجلوس 23:00–23:59)
   قفزت خطوةُ تقديم الساعة يوماً محلياً كاملاً فلم يُعرف اسمُه (-1 ⇒ «»). الآن يخطو يوماً تقويمياً محلياً ظهراً.
   الساعةُ تُثبَّت بحقن Date في سياق الخدمة (كما تحقن الاختباراتُ Intl) — في أربع مناطق عبر عملياتٍ فرعية بـTZ:
   23:59 · 00:00 · 00:01 محلياً في عدة أيام (اليوم وما حول قفزتَي التوقيت الصيفي) وحدُّ يوم الرياض (21:00 UTC ± دقيقة).
   ولكل لحظة: كلُّ يومٍ في ±396 يوماً يجاور تغيّرَ فرق التوقيت، وكلُّ سابعِ يوم — اسمُه هو يومُ تاريخه الميلادي. (TEST_ONLY) */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = fs.readFileSync(path.join(ROOT, 'src/i18n/385-calendar.js'), 'utf8');
const RealDate = Date;
/* Date بساعةٍ مثبَّتة: new Date() و Date.now() يعطيان اللحظةَ المثبَّتة، وما عداهما كما هو */
const pinnedDate = (t) => class extends RealDate { constructor(...a) { if (a.length === 0) super(t); else super(...a); } static now() { return t; } };
const service = (D) => { const W = { KIVO: {}, Intl, Date: D, Math, Object, JSON, Error }; vm.createContext(W); vm.runInContext(SRC, W, { filename: '385-calendar.js' }); return W.KIVO.BassamCal; };
/* الخوارزميةُ المحذوفة حرفاً (خطوةُ 24 ساعةً من «الآن») — ضابطٌ سلبي يثبت أن اللحظاتِ المثبَّتة تصيب الخلل فعلاً */
const oldIndex = (C, D, y, m, d) => { const now = new D(); for (let i = -400; i <= 400; i++) { const at = new D(now.getTime() + i * 864e5), h = C.hParts(at); if (h.y === y && h.m === m && h.d === d) return at.getDay(); } return -1; };

function proof() {
  const out = { instants: 0, days: 0, oldMissed: 0 };
  const local = [[2026, 10, 22], [2026, 10, 23], [2026, 2, 7], [2026, 2, 8], [2026, 9, 31], [2026, 10, 1], [2027, 2, 13], [2027, 2, 14]];
  const pins = [];
  for (const [y, mo, d] of local) pins.push(new RealDate(y, mo, d - 1, 23, 59).getTime(), new RealDate(y, mo, d, 0, 0).getTime(), new RealDate(y, mo, d, 0, 1).getTime());
  for (const d of [22, 23]) { const b = RealDate.UTC(2026, 10, d, 21); pins.push(b - 6e4, b, b + 6e4); }   /* منتصفُ ليل الرياض */
  for (const t of pins) {
    const D = pinnedDate(t), C = service(D), now = new D(); out.instants++;
    for (let i = -396; i <= 396; i++) {
      const g = new D(now.getFullYear(), now.getMonth(), now.getDate() + i, 12), p = new D(g.getFullYear(), g.getMonth(), g.getDate() - 1, 12), q = new D(g.getFullYear(), g.getMonth(), g.getDate() + 1, 12);
      const shift = g.getTimezoneOffset() !== p.getTimezoneOffset() || g.getTimezoneOffset() !== q.getTimezoneOffset();
      if (!shift && i % 7) continue;
      const h = C.hParts(g); out.days++;
      assert.equal(C.hWeekdayIndex(h.y, h.m, h.d, 400), g.getDay(), 'اسمُ اليوم هو يومُ التاريخ الميلادي ' + [process.env.TZ, new RealDate(t).toISOString(), g.toDateString()]);
      if (oldIndex(C, D, h.y, h.m, h.d) === -1) out.oldMissed++;
    }
  }
  return out;
}

if (process.env.V7_D6_WD_CHILD) { process.stdout.write(JSON.stringify(proof())); process.exit(0); }

const ZONES = ['Asia/Riyadh', 'UTC', 'America/Los_Angeles', 'Pacific/Kiritimati'];
const child = (TZ) => new Promise((ok, no) => execFile(process.execPath, ['--no-warnings', fileURLToPath(import.meta.url)], { env: { ...process.env, TZ, V7_D6_WD_CHILD: '1' }, encoding: 'utf8' }, (e, out, err) => (e ? no(new Error(TZ + ': ' + String(err || e).slice(0, 4000))) : ok(JSON.parse(out)))));

test('the weekday of a Hijri day does not depend on the clock: 23:59/00:00/00:01 local and the Riyadh day boundary, in four zones', async () => {
  const got = await Promise.all(ZONES.map(child)), seen = {};
  for (const [i, TZ] of ZONES.entries()) { seen[TZ] = got[i]; assert.equal(got[i].instants, 30, TZ); assert.ok(got[i].days > 30 * 100, TZ); console.log('WD ' + TZ + ' ' + JSON.stringify(got[i])); }
  /* الضابطُ السلبي: الخوارزميةُ المحذوفة تفقد أياماً في لوس أنجلوس عند 23:59 — ولا تفقد شيئاً حيث لا توقيتَ صيفي */
  assert.ok(seen['America/Los_Angeles'].oldMissed > 0, 'اللحظاتُ المثبَّتة تصيب خللَ الخطوة 24 ساعة');
  for (const TZ of ['Asia/Riyadh', 'UTC', 'Pacific/Kiritimati']) assert.equal(seen[TZ].oldMissed, 0, TZ);
});
