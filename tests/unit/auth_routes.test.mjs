/* KIVO_263 · SOT-096 — مساراتُ المصادقة والجلسة في طبقةٍ واحدة (workers/parts/062a-auth-routes.js) — على العامل الحقيقي:
   (أ) البنية: authPublicRoutes/authSessionRoutes في الجزء الجديد وحده، وhandle لا يحمل نصَّ مساراتها
   (ب) السلوكُ بعد النقل كما كان: الدخولُ يضع كوكي HttpOnly · whoami/me بالجلسة · checkpw يقبل ويرفض ويحجز · إنهاءُ جلساتي الأخرى ·
       الخروجُ GET من مصدرٍ آخر 403 وبلا مصدرٍ 303 يمسح الكوكي · POST يبطل الرمز · الاستعادةُ بمفتاحٍ خاطئ تُرفض */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTestEnv, client, ROOT, since } from './harness.mjs';
const PARTS = path.join(ROOT, 'workers', 'parts');
test('البنية: مساراتُ المصادقة في 062a-auth-routes.js وحده', since(163), () => {
  const p = fs.readFileSync(path.join(PARTS, '062a-auth-routes.js'), 'utf8'), h = fs.readFileSync(path.join(PARTS, '063-enf-api-and-handler.js'), 'utf8');
  for (const r of ['/api/login', '/api/logout', '/api/recover', '/api/me', '/api/me/sess/kill', '/api/checkpw', '/api/whoami']) {
    assert.ok(p.includes("path === '" + r + "'"), 'الجزءُ يحمل ' + r);
    assert.ok(!h.includes("path === '" + r + "'"), 'handle لا يحمل ' + r);
  }
  assert.match(h, /await authPublicRoutes\(request, env, path, url\)/); assert.match(h, /await authSessionRoutes\(request, env, path, ss\)/);
  const order = JSON.parse(fs.readFileSync(path.join(ROOT, 'workers', 'parts.json'), 'utf8')).parts.map(x => x.file);
  assert.ok(order.indexOf('062a-auth-routes.js') >= 0 && order.indexOf('062a-auth-routes.js') < order.indexOf('063-enf-api-and-handler.js'), 'ترتيبُ الأجزاء');
});
test('السلوك: الدخول · الجلسة · فحصُ كلمة المرور · جلساتي · الخروج · الاستعادة', async () => {
  const env = makeTestEnv(); const C = client(env);
  const su = await C.login('0501234567', '583927'); assert.ok(su.ok, 'الدخول بحساب اختبار مزروع صراحةً');
  const r0 = await C.req('/api/login', { method: 'POST', body: { u: '0501234567', p: '583927' } });
  assert.match(r0.headers.get('set-cookie') || '', /HttpOnly/i, 'كوكي HttpOnly');
  assert.equal((await C.api('/api/whoami')).status, 401, 'بلا جلسة 401');
  assert.equal((await C.api('/api/whoami', { cookie: su.ck })).j.ok, 1, 'whoami بالجلسة');
  const me = await C.api('/api/me', { cookie: su.ck }); assert.equal(me.j.ok, 1); assert.ok(Array.isArray(me.j.sess) && me.j.sess.some(s => s.mine), '«صفحتي»: جلستي بين الجلسات');
  assert.equal((await C.api('/api/checkpw', { method: 'POST', cookie: su.ck, body: { p: '583927' } })).j.ok, 1, 'checkpw صحيحة');
  assert.equal((await C.api('/api/checkpw', { method: 'POST', cookie: su.ck, body: { p: 'x' } })).j.ok, 0, 'checkpw خاطئة');
  const other = await C.login('0501234567', '583927');
  assert.equal((await C.api('/api/me/sess/kill', { method: 'POST', cookie: su.ck })).j.ok, 1);
  assert.equal((await C.api('/api/whoami', { cookie: other.ck })).status, 401, 'جلستي الأخرى أُنهيت');
  assert.equal((await C.api('/api/whoami', { cookie: su.ck })).status, 200, 'وجلستي باقية');
  const xg = await C.req('/api/logout', { cookie: su.ck, headers: { origin: 'https://evil.example' } }); assert.equal(xg.status, 403, 'GET من مصدرٍ آخر 403');
  assert.equal((await C.api('/api/whoami', { cookie: su.ck })).status, 200, 'ولم يُخرِج');
  const g = await C.req('/api/logout', { cookie: su.ck }); assert.equal(g.status, 303); assert.equal(g.headers.get('location'), '/');
  assert.equal((await C.api('/api/whoami', { cookie: su.ck })).status, 401, 'GET الخروج أبطل الرمز');
  const s2 = await C.login('0501234567', '583927'); assert.equal((await C.api('/api/logout', { method: 'POST', cookie: s2.ck })).j.ok, 1);
  assert.equal((await C.api('/api/whoami', { cookie: s2.ck })).status, 401, 'POST الخروج أبطل الرمز');
  const rc = await C.api('/api/recover', { method: 'POST', body: { key: 'AAAA-BBBB-CCCC-DDDD-EEEE', pw: '135792' } }); assert.equal(rc.j.ok, 0, 'استعادةٌ بلا مفتاحٍ صحيح تُرفض');
});
