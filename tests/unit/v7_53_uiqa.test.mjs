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

test('S15 — رفضُ «الإحصائيات اليومية» بالنطاق يقول إن الإدخال لمدير المنصة أو لصاحب صلاحية الإحصائيات', async () => {
  const calls = [];
  const fetch = async (u, o) => { calls.push((o && o.method) || 'GET'); const post = o && o.method === 'POST';
    return { ok: !post, status: post ? 403 : 200, json: async () => (post ? { ok: 0, err: 'denied', why: 'scope', reasonKeys: [] } : { ok: 1, rev: 3, data: {} }) }; };
  const ctx = { KIVO: {}, window: { __BS_BOOT: { uid: 'TEST_ONLY_u', srv: 1, cf: 1 } }, fetch, JSON, Object, String, Number, Promise }; vm.createContext(ctx);
  vm.runInContext(rd('src/systems/dstats/client/580-historical-import.js'), ctx);
  const D = ctx.KIVO.DailyStats; await D.refresh();
  assert.equal(await D.save(D.read()), false, 'refused');
  assert.deepEqual(calls, ['GET', 'POST']);
  const m = D.message();
  assert.match(m, /مدير المنصة/, m); assert.match(m, /صلاحية «الإحصائيات اليومية»/, m);
  assert.doesNotMatch(m, /ونطاق البيانات والأقفال/, 'not the generic message');
});

test('S14 — رأسُ مؤشرات الإشغال: العددُ سجلاتُ «مصلى × يوم» فالتسميةُ تقول ذلك (لا «المصليات 36» لستة مصليات)', () => {
  for (const rel of ['src/systems/daily/client/logic.js', 'src/pages/Daily Sessions.dc.html']) {
    const s = rd(rel);
    assert.doesNotMatch(s, /n: "المصليات", v: r\(I\)/, rel + ': not labelled as a count of prayer halls');
    assert.match(s, /n: "سجلات المصليات", v: r\(I\), p: "مصلى × يوم"/, rel);
    for (const [n, u, v] of [['الأبواب', 'باب', 'R'], ['المسارات', 'مسار', 'G'], ['المعالم', 'معلم', 'Z']]) assert.ok(s.includes('n: "سجلات ' + n + '", v: r(' + v + '), p: "' + u + ' × يوم"'), rel + ' · ' + n);
  }
});
