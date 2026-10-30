/* KIVO_264 · المراجعة المستقلة rev264b — بوابةُ الدخول الأول (335) وكلمةُ المرور الحالية «cur» من طرفٍ إلى طرف على العامل الحقيقي والكتل الحقيقية
   (280 · 310 · 320 · 330 · 440 · 335) بالوضعين: S1 تغييرٌ إجباري رُفض (مهلةُ 15 دقيقة) ⇒ رسالةٌ وخروج لا «تمّ» (F3) · S2 جلسةٌ حديثة ⇒ يثبت ·
   S3 رفضُ مفتاحٍ آخر لا يُخرج من ثبت تغييرُه (R2) · S4/S5 إعادةُ الإرسال بعد خطأ شبكة أو تعارض تحمل «cur» (R1) · S6 الحارسُ المقفل ⇒ «محاولات كثيرة» (R4). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './harness.mjs';

test('بوابةُ الدخول الأول و«cur» من طرفٍ إلى طرف — S1…S6 بالوضعين (المراجعة rev264b: F3 · R1 · R2 · R4)', () => {
  let out = '';
  try { out = execFileSync(process.execPath, [path.join(ROOT, 'tests/unit/k264_gate335_e2e.mjs'), ROOT], { env: process.env, encoding: 'utf8', timeout: 240000, maxBuffer: 1 << 24 }); }
  catch (e) { out = String((e && e.stdout) || '') + String((e && e.stderr) || ''); }
  const m = /RESULT (\d+) pass \/ (\d+) fail/.exec(out);
  assert.ok(m, 'سطرُ النتيجة: ' + out.slice(-600));
  assert.equal(+m[2], 0, out.split('\n').filter((l) => l.startsWith('FAIL')).join('\n'));
  assert.ok(+m[1] >= 24, 'التأكيداتُ كلُّها جرت: ' + m[1]);
});
