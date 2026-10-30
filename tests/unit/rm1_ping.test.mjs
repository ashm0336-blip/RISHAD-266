/* RM-1 · AUD-004 — /api/ping: لا إفشاءَ لأعداد الحسابات/الجلسات/المراجعة بلا جلسة مدير النظام */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

test('/api/ping: مختصرٌ للزائر · كاملٌ لمدير النظام · مختصرٌ لمستخدمٍ عادي', async () => {
  // Empty D1 must report fresh=1; deliberately seeded test-only D1 must report fresh=0.
  const blank = makeEnv({}); const ping0 = await client(blank).api('/api/ping');
  assert.equal(ping0.status, 200);
  assert.deepEqual(Object.keys(ping0.j).sort(), ['cf', 'fresh', 'ok', 'ver']);
  assert.equal(ping0.j.fresh, 1, 'القاعدة الفارغة دون مدير نظام تعلن أنها جديدة');
  const env = makeTestEnv({}); const C = client(env);
  const p0 = await C.api('/api/ping'); assert.equal(p0.status, 200);
  assert.deepEqual(Object.keys(p0.j).sort(), ['cf', 'fresh', 'ok', 'ver']);
  assert.equal(p0.j.fresh, 0, 'قاعدة اختبار مهيأة بحساب صريح لا تظهر كقاعدة جديدة');
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  const p1 = await C.api('/api/ping', { cookie: su.ck }); assert.equal(p1.status, 200);
  assert.ok('users' in p1.j && 'sess' in p1.j && 'rev' in p1.j, 'مديرُ النظام يرى الأعداد'); assert.equal(p1.j.users, 1); assert.ok(p1.j.sess >= 1);
  /* مستخدمٌ عادي: موظفٌ بحساب دخول في إدارة */
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dA', name: 'إدارة', gid: '' }]) });
  const p2 = await C.api('/api/ping', { cookie: 'bs_tok=nonsense' }); assert.deepEqual(Object.keys(p2.j).sort(), ['cf', 'fresh', 'ok', 'ver'], 'كوكي غيرُ صالح = زائر');
  assert.equal(p2.j.fresh, 0);
  const h = await C.api('/api/ping'); assert.equal(h.h.get('Cache-Control'), 'no-store'); assert.equal(h.h.get('X-Content-Type-Options'), 'nosniff');
});
