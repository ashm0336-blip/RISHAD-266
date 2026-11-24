/* V7 · 53 تقويم (REVIEW 46): «اليوم» في صفحات الاسترشاد والمضبوطات ورصد الحالات = يومُ ساعة خادمها، في كل ساعة.
   الاسترشاد والمضبوطات: الخادم cuClock() = pfDayAt(الآن) — يومُ الرياض المدني بلا مهلة ⇒ الصفحة gAt(new Date()).
   رصد الحالات: الخادم ctx.today = calToday(الآن) (048 · حارسُ DateRange) — اليومُ التشغيلي بمهلة 3 ساعات ⇒ الصفحة gToday().
   كانت الصفحتان الأوليان على gToday فتختلفان عن الخادم بين 00:00 و03:00 بالرياض (تقريرٌ يُحفظ على أمس والخادمُ على اليوم).
   اللحظات: 22:00 UTC (01:00 الرياض — داخل النافذة) · 12:00 UTC · والساعةُ المثبَّتة (KIVO_CLOCK عبر clock.mjs إن أُعطيت). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './harness.mjs';
import { loadServerCal, loadClientCal } from './cal_fx.mjs';

const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const S = loadServerCal(); vm.runInContext(rd('workers/parts/062b-me-history.js'), S, { filename: '062b-me-history.js' });
const C = loadClientCal();
const AT = [Date.parse('2026-11-24T22:00:00Z'), Date.parse('2026-11-24T12:00:00Z'), Date.parse('2026-11-30T22:30:00Z'), Date.now()];

test('irshad · seized: the page «today» (gAt(new Date())) is the server clock day (cuClock = pfDayAt) at 22:00 and 12:00 UTC', () => {
  assert.match(rd('workers/parts/016-base-shared.js'), /function cuClock\(\) \{\s*var x = pfDayAt\(Date\.now\(\)\);/, 'the server clock is pfDayAt(now)');
  for (const f of ['irshad', 'seized']) {
    const L = rd('src/systems/' + f + '/client/logic.js');
    assert.doesNotMatch(L, /BassamCal\.gToday\(\)/, f + ': no operational-day today on the page');
    assert.equal((L.match(/KIVO\.BassamCal\.gAt\(new Date\(\)\)/g) || []).length, 4, f + ': the four «today» sites take the civil day');
  }
  for (const t of AT) { const p = S.pfDayAt(t); assert.equal(C.gAt(new Date(t)).k, p.dk, new Date(t).toISOString() + ': page today = server clock'); }
  assert.notEqual(C.gToday(AT[0]).k, S.pfDayAt(AT[0]).dk, 'control: at 22:00 UTC the operational day is the day before — the old page source differed');
});

test('rasd: the page «today» (gToday()) is the server day of its guard (calToday) at 22:00 and 12:00 UTC', () => {
  assert.match(rd('workers/parts/048-permv4.js'), /today: calToday\(Date\.now\(\)\)/, 'the DateRange guard day is calToday(now)');
  assert.match(rd('src/systems/rasd/client/logic.js'), /const t = KIVO\.BassamCal\.gToday\(\);/, 'rasd keeps the operational day');
  for (const t of AT) assert.equal(C.gToday(t).k, S.calToday(t).k, new Date(t).toISOString() + ': page today = server day');
});
