/* V7 · د4-أ — قائمةُ الاستثناء لاختبار الحذف (tests/removal/names.allow.json): كلُّ مدخلٍ ما زال له موضع.
     · المستودع (الشجرةُ الكاملة): لا مدخلَ بلا موضع — في حالة حذفٍ ما يبقى المقطعُ في ملفه ويسمّي نظاماً غائباً فيها
     · السلوك: مدخلٌ مختلَق (مقطعٌ ليس في الملف · مقطعٌ بلا اسم نظام · ملفٌ ليس من المبحوث فيها · نمطٌ لا يطابق) يُبلَّغ عنه باسمه */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SRC, SYSTEMS } from './harness.mjs';
import { staleAllow } from '../removal/names_allow.mjs';

const ALLOW = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'removal', 'names.allow.json'), 'utf8'));
const FULL = ['award', 'dstats', 'irshad', 'seized'].every((k) => SYSTEMS.includes(k));

test('V7 · د4-أ: المستودع — كلُّ مدخلٍ في قائمة الاستثناء له موضع', { skip: FULL ? false : 'يُفحص على الشجرة الكاملة (نظامٌ غائب هنا)' }, () => {
  assert.deepEqual(staleAllow(ALLOW, ROOT, SRC), []);
});

test('V7 · د4-أ: السلوك — المدخلُ الذي زال موضعُه يُبلَّغ عنه', { skip: FULL ? false : 'يُفحص على الشجرة الكاملة (نظامٌ غائب هنا)' }, () => {
  const F = 'workers/parts/016-base-shared.js', mk = (over) => Object.assign({ skipFiles: [], patterns: [], entries: [] }, over);
  let r = staleAllow(mk({ entries: [{ file: F, match: ["swallow('dstats', e)"], kind: 'legit', why: 'x' }] }), ROOT, SRC);
  assert.deepEqual(r, [], 'مقطعٌ موجود في ملفه: مقبول');
  r = staleAllow(mk({ entries: [{ file: F, match: ["TEST_ONLY_award_gone('x')"], kind: 'legit', why: 'x' }] }), ROOT, SRC);
  assert.equal(r.length, 1); assert.match(r[0], /TEST_ONLY_award_gone.*لا موضعَ له/);
  r = staleAllow(mk({ entries: [{ file: F, match: ['function cuClock'], kind: 'legit', why: 'x' }] }), ROOT, SRC);
  assert.equal(r.length, 1); assert.match(r[0], /لا موضعَ له/);
  r = staleAllow(mk({ entries: [{ file: 'workers/parts/TEST_ONLY-none.js', match: ['award'], kind: 'legit', why: 'x' }] }), ROOT, SRC);
  assert.equal(r.length, 1); assert.match(r[0], /ليس من الملفات المبحوث فيها/);
  r = staleAllow(mk({ patterns: [{ pattern: 'TEST_ONLY_[a-z]+_seized_never', kind: 'legit', why: 'x' }], skipFiles: [{ file: 'workers/parts/TEST_ONLY-none.js', kind: 'legit', why: 'x' }] }), ROOT, SRC);
  assert.equal(r.length, 2); assert.match(r.join('\n'), /patterns: .*لا يطابق/); assert.match(r.join('\n'), /skipFiles: .*ليس من الملفات/);
  /* مقطعٌ لا يظهر إلا بغياب نظام (النصُّ المحايد لفتحة) له موضع */
  r = staleAllow(mk({ entries: [{ file: 'workers/parts/019c-employee-transition.js', match: ['awards: {}'], kind: 'legit', why: 'x' }] }), ROOT, SRC);
  assert.deepEqual(r, [], 'النصُّ المحايد لفتحةٍ يُحسب موضعاً');
});
