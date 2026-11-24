/* V7 · 53 تقويم (REVIEW 44) — سطرُ السنة في رأس الصفحات الخمس (الخطة التشغيلية · الجدول الشهري · التشغيل الميداني · المهام · الإحصائيات):
   السنةُ ميلادية (2026) وتحتها المدى الهجري المقابل «1447 – 1448 هـ». كانت سمةُ plan+staff في 565 تعامل السنةَ الميلادية كأنها هجرية
   (hGregYearRange(2026) ⇒ «2587 – 2588 م»). يُشغَّل 385 و565 الحقيقيان ومنطقُ كل صفحة في vm، ويُقرأ السطرُ من renderVals حيث يتيسّر. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT } from './harness.mjs';

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
function kit() {
  const KIVO = {}, ctx = vm.createContext({ KIVO, Intl, Date, Math, JSON, Object, Array, String, Number, RegExp, Map, Set, Error, console });
  ctx.window = ctx; ctx.globalThis = ctx;
  for (const f of ['src/i18n/380-hijri-fallback.js', 'src/i18n/385-calendar.js', 'src/components/565-page-kit.js']) vm.runInContext(read(f), ctx, { filename: f });
  return { KIVO, ctx };
}
const WANT = '1447 – 1448 هـ';

test('خدمةُ التقويم: المدى الهجري لسنة 2026 الميلادية «1447 – 1448 هـ»', () => {
  const { KIVO } = kit();
  assert.equal(KIVO.BassamCal.hRangeOfYear(2026), WANT);
  assert.equal(KIVO.BassamCal.hRangeOfYear(2025), '1446 – 1447 هـ');
});

test('سمةُ plan+staff في 565 (الخطة التشغيلية والجدول الشهري): gregYearRange(2026) = «1447 – 1448 هـ» لا «2587 – 2588 م» · وgregOf مدى الشهر الهجري', () => {
  const { KIVO } = kit();
  class D { constructor() { this.state = {}; } setState() {} }
  const C = KIVO.BassamPageKit.base(D, ['plan+staff']), c = new C();
  assert.equal(c.gregYearRange(2026), WANT);
  assert.doesNotMatch(c.gregYearRange(2026), /25\d\d|م$/);
  assert.equal(c.gregOf(2026, 9), KIVO.BassamCal.hRangeOfMonth('2026-10'));
});

test('الصفحاتُ الخمس تربط سطرَ السنة بالمدى الهجري للسنة الميلادية (خدمة التقويم أو سمة 565)', () => {
  const { KIVO } = kit();
  const P = {
    'src/systems/plan/client/logic.js': /gregRange: this\.gregYearRange\(e\.year\)/,
    'src/systems/staff/client/logic.js': /gregRange: this\.gregYearRange\(s\.year\)/,
    'src/systems/daily/client/logic.js.tpl': /dGregRange: this\.hLineOfYear\(s\.year\)/,
    'src/systems/tasks/client/logic.js': /gregRange: KIVO\.BassamCal\.hRangeOfYear\(e\.year\)/,
    'src/systems/dstats/client/logic.js': /gregRange: KIVO\.BassamCal\.hRangeOfYear\(s\.year\)/,
  };
  for (const [f, rx] of Object.entries(P)) assert.match(read(f), rx, f);
  const daily = read('src/systems/daily/client/logic.js.tpl').match(/hLineOfYear\(t\) \{ return ([^}]+) \}/);
  assert.ok(daily, 'hLineOfYear في التشغيل الميداني');
  const hLine = vm.runInNewContext('(function (t) { return ' + daily[1] + ' })', { KIVO });
  assert.equal(hLine(2026), WANT, 'التشغيل الميداني');
  for (const v of ['plan', 'staff', 'daily', 'tasks', 'dstats']) {
    const html = read('src/systems/' + v + '/client/view.html');
    assert.match(html, /\{\{d?[gG]regRange\}\}/, v + ': سطرُ السنة في القالب');
  }
});
