/* V7 · 53 (uiqa) — بنودُ الفحص الحي في الواجهة والرسائل (FIX_53_LIVEQA · FIX_53_SCALE · REPLY_52_3 ٧/٨) — TEST_ONLY.
   كلُّ حالةٍ هنا تفشل على الأساس 3486e01 وتنجح بعد الإصلاح. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('١٣ — قاعدةُ تحيةٍ واحدة: الساعة 4 فجراً ليست «مساء الخير»، و«صفحتي» و«الموظفون» يقرآن القاعدة نفسها', () => {
  const ctx = { KIVO: {} }; vm.createContext(ctx);
  vm.runInContext(rd('src/services/440-count.js'), ctx);
  const G = ctx.KIVO.BassamGreet;
  assert.equal(typeof G, 'function', 'KIVO.BassamGreet موجودة');
  const at = (h) => G(h).text;
  for (let h = 0; h < 12; h++) assert.notEqual(at(h), 'مساء الخير', 'الساعة ' + h);
  assert.equal(at(4), 'صباح الخير'); assert.equal(at(9), 'صباح الخير');
  assert.equal(at(13), 'نهارك سعيد'); assert.equal(at(18), 'مساء الخير'); assert.equal(at(23), 'ليلة هانئة'); assert.equal(at(2), 'ليلة هانئة');
  assert.equal(G(4).day, true); assert.equal(G(18).day, false);
  for (const rel of ['src/modules/profile/logic.js', 'src/modules/employees/logic.js']) {
    const s = rd(rel);
    assert.ok(s.includes('KIVO.BassamGreet('), rel + ' يقرأ القاعدة المشتركة');
    assert.doesNotMatch(s, /\?\s*"صباح الخير"/, rel + ': لا قاعدةَ تحيةٍ ثانية داخل الصفحة');
  }
});
