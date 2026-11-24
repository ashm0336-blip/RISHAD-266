/* V7 · 53 تقويم — REVIEW 44 ❓2: شكلُ ملف Production الحقيقي — جدولُ جمادى الآخرة 1448 «معتمد ومقفل» قبل التحويل. TEST_ONLY.
   نوفمبر 2026 = 1–10 من جمادى الأولى 1448 (5) + 11–30 من جمادى الآخرة (6) — يُثبَّت من Intl أم القرى هنا لا من 019v.
   ① أقفالُ الجدول (بلا أيام في السجل، ق3 «للجدول ولأقفال المهام: معتمد إن اعتُمد المصدران معاً، وإلا مفتوح بحكم مضى للماضي»):
      نوفمبر بلا سجلّ (مفتوح) إن لم تُعتمد جمادى الأولى، ويُذكر في تقرير الأقفال بمصدريه — ومعتمدٌ إن اعتُمدا معاً.
   ② ورديةُ نوفمبر (ق4، الأغلبية): من جمادى الآخرة (20 يوماً من 30)، والتعارضُ يُذكر.
   ③ الموارد ذاتُ الأيام (ق3 §3.3): أيامُ جمادى الآخرة في نوفمبر (11–30) مقفلةٌ في الخلايا يوماً يوماً بقاعدة 010 نفسها. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadServerCal } from './cal_fx.mjs';

const S = loadServerCal();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/* المساعداتُ الحقيقية من أجزائها (017 isObj · 019o ocOwn/ocSet) — سطراً سطراً كما في العامل */
const line = (f, name) => { const s = fs.readFileSync(path.join(ROOT, 'workers/parts', f), 'utf8').split('\n').find((l) => l.startsWith('function ' + name + '(')); assert.ok(s, f + ': ' + name); return s; };
vm.runInContext([line('017-authorize-core.js', 'isObj'), line('019o-operational-codec.js', 'ocOwn'), line('019o-operational-codec.js', 'ocSet')].join('\n'), S);
S.opRegistry = () => ({});   /* calConvBucketFixed: لا مخطّطَ في السياق — فالتعارضُ في التقرير وحده */
const J = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const F = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
const hij = (d) => { const o = {}; F.formatToParts(new Date(Date.UTC(2026, 10, d, 12))).forEach((p) => (o[p.type] = +p.value)); return o.year + '-' + o.month; };
const ctx = () => ({ rep: { locks: [], months: 0, conflicts: [] } });

test('R44 · شكلُ نوفمبر 2026: 1–10 جمادى الأولى · 11–30 جمادى الآخرة 1448 (Intl)', () => {
  for (let d = 1; d <= 30; d++) assert.equal(hij(d), d <= 10 ? '1448-5' : '1448-6', 'nov ' + d);
  assert.deepEqual(J(S.calMajority('2026-11')), { h: '1448-6', y: 1448, m: 6, days: 20, tie: false });
});

test('R44 · أقفالُ الجدول: جمادى الآخرة معتمدة وحدها ⇐ نوفمبر مفتوح (ق3 للجدول) ومذكورٌ بمصدريه · والمصدران معتمدان ⇐ نوفمبر معتمد', () => {
  for (const m5 of [undefined, { mo: 1 }]) {
    const src = { '1448-6': true }; if (m5) src['1448-5'] = m5;
    const c = ctx(), out = J(S.calConvLocks('bassam_staffing_locks_v1', src, c));
    assert.equal(Object.hasOwn(out, '2026-11'), false, 'نوفمبر بلا قفل: «مسودة مفتوحة»');
    assert.equal(Object.hasOwn(out, '2026-12'), false, 'ديسمبر (1–9 جمادى الآخرة + رجب غير المعتمد) بلا قفل');
    const r = J(c.rep.locks).find((x) => x.g === '2026-11');
    assert.deepEqual(r, { res: 'bassam_staffing_locks_v1', g: '2026-11', from: ['1448-5', '1448-6'], v: null }, 'الفقدُ مذكورٌ في تقرير الأقفال لا صامت');
  }
  const both = J(S.calConvLocks('bassam_staffing_locks_v1', { '1448-5': true, '1448-6': true, '1448-7': true }, ctx()));
  assert.equal(both['2026-11'], true, 'المصدران معتمدان ⇐ نوفمبر معتمد');
  assert.equal(both['2026-12'], true, 'جمادى الآخرة ورجب معتمدان ⇐ ديسمبر معتمد');
});

test('R44 · ورديةُ نوفمبر من جمادى الآخرة بالأغلبية (ق4) والتعارضُ يُذكر', () => {
  const c = ctx(), src = { '1448-5': { 'TEST_ONLY e1': { shift: 'TEST_ONLY A' } }, '1448-6': { 'TEST_ONLY e1': { shift: 'TEST_ONLY B' } } };
  const out = J(S.calConvStaffing('bassam_staffing_v3', src, c));
  assert.equal(out['2026-11']['TEST_ONLY e1'].shift, 'TEST_ONLY B');
  const q = J(c.rep.conflicts).find((x) => x.g === '2026-11');
  assert.equal(q.n, 1); assert.equal(q.items[0].ha, '1448-6'); assert.equal(q.items[0].hb, '1448-5');
});

test('R44 · الموارد ذاتُ الأيام: أيامُ جمادى الآخرة في نوفمبر مقفلةٌ في الخلايا (ق3 §3.3) — اليوم 2026-11-24', () => {
  for (const m5 of [undefined, { mo: 1 }]) {
    const src = { '1448-6': true }; if (m5) src['1448-5'] = m5;
    const r = S.calMonthRule('2026-11', src, '2026-11-24');
    assert.equal(r.ok, true, 'كلُّ يومٍ بعد التحويل كما كان قبله');
    for (let d = 11; d <= 30; d++) assert.equal(S.calLockedIn(r.rec, 2026, 11, d, { y: 2026, m: 11, d: 24 }), true, 'nov ' + d + ' (جمادى الآخرة) مقفل');
    for (let d = 11; d <= 30; d++) assert.equal(r.days[d - 1].why, 'ap');
  }
});
