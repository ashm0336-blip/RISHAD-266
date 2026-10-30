/* RM-5 · SOT-138 — CSRF / Origin / Cross-site على العامل الحقيقي: كلُّ كتابة (POST/PUT/DELETE) تُرفض 403 إن حمل الطلبُ Origin غريباً أو Sec-Fetch-Site: cross-site
   قبل أي قراءةٍ للجسم أو جلسة · الطلبُ بلا Origin (عميلٌ غير متصفح) يمرّ إلى المصادقة كما كان (العقد الموثَّق) · القراءاتُ GET لا تُرفض بالمصدر لكنها تحتاج
   الجلسة · الخروجُ GET/POST يرفض same-site وcross-site · كوكي الجلسة HttpOnly · SameSite=Lax · Secure إلا على localhost · Path=/ · لا كوكي على 401. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLegacyTestEnv as makeEnv, client } from './harness.mjs';
const WRITES = ['/api/login', '/api/recover', '/api/me/sess/kill', '/api/checkpw', '/api/save', '/api/sess/kill', '/api/guard/unlock', '/api/recovery/new', '/api/reset', '/api/policy', '/api/retro', '/api/logout', '/api/authz-migrate', '/api/authz-test', '/api/img/x'];
const READS = ['/api/whoami', '/api/me', '/api/get?keys=bassam_depts_v1', '/api/changes?since=0', '/api/aud', '/api/presence', '/api/sec', '/api/guard', '/api/recovery', '/api/permv2', '/api/overview'];
test('كلُّ كتابةٍ تُرفض 403 origin مع Origin غريب أو Sec-Fetch-Site: cross-site — قبل الجلسة والجسم', async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const bad = [];
  for (const p of WRITES) for (const m of ['POST', 'PUT', 'DELETE']) {
    const a = await C.api(p, { method: m, cookie: su.ck, body: {}, headers: { origin: 'https://evil.example' } });
    if (a.status !== 403 || a.j.err !== 'origin') bad.push(m + ' ' + p + ' origin→' + a.status);
    const b = await C.api(p, { method: m, cookie: su.ck, body: {}, headers: { 'sec-fetch-site': 'cross-site' } });
    if (b.status !== 403 || b.j.err !== 'origin') bad.push(m + ' ' + p + ' cross-site→' + b.status);
  }
  assert.deepEqual(bad, []);
  const okSame = await C.api('/api/whoami', { method: 'GET', cookie: su.ck, headers: { origin: 'http://x', 'sec-fetch-site': 'same-origin' } }); assert.equal(okSame.status, 200, 'same-origin يمرّ');
});
test('الطلبُ بلا Origin (عميلٌ غيرُ متصفح) يصل إلى المصادقة كما كان: بلا جلسة 401 · بجلسة يعمل — والقراءاتُ GET لا تُرفض بالمصدر لكنها تحتاج الجلسة', async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin');
  const r = await C.req('/api/save', { method: 'POST', body: JSON.stringify({ set: {}, del: [], base: {} }), headers: { 'Content-Type': 'application/json' } });
  assert.equal(r.status, 401, 'بلا Origin وبلا جلسة: 401 لا 403 (العقدُ الموثَّق)');
  const r2 = await C.req('/api/save', { method: 'POST', body: JSON.stringify({ set: {}, del: [], base: {} }), headers: { 'Content-Type': 'application/json', cookie: su.ck } });
  assert.equal(r2.status, 200, 'بلا Origin وبجلسة: يعمل');
  for (const p of READS) { const x = await C.api(p, { headers: { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' } }); assert.equal(x.status, 401, 'قراءةٌ بلا جلسة: ' + p + ' → ' + x.status); }
  const y = await C.api('/api/whoami', { cookie: su.ck, headers: { 'sec-fetch-site': 'cross-site' } }); assert.equal(y.status, 200, 'القراءةُ بجلسة لا تُرفض بالمصدر (لا أثرَ لها؛ الكوكي SameSite=Lax تمنع إرسالَها من مواقع أخرى أصلاً)');
});
test('الخروجُ بالتنقّل (GET /api/logout): يرفض same-site وcross-site وOrigin غريباً (رابطٌ من موقعٍ آخر لا يُخرج المستخدم) ويقبل same-origin وبلا إشارة · POST يخضع للحارس العام', async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin');
  for (const h of [{ 'sec-fetch-site': 'same-site' }, { 'sec-fetch-site': 'cross-site' }, { origin: 'https://evil.example' }]) { const r = await C.req('/api/logout', { headers: Object.assign({ cookie: su.ck }, h) }); assert.equal(r.status, 403, JSON.stringify(h)); }
  assert.equal((await C.api('/api/whoami', { cookie: su.ck })).status, 200, 'الجلسةُ ما زالت حيّة');
  const p = await C.api('/api/logout', { method: 'POST', cookie: su.ck, body: {}, headers: { 'sec-fetch-site': 'cross-site' } }); assert.equal(p.status, 403, 'POST cross-site: الحارسُ العام');
  const g = await C.req('/api/logout', { headers: { cookie: su.ck, 'sec-fetch-site': 'same-origin' } }); assert.ok([200, 302, 303].includes(g.status), 'same-origin يخرج: ' + g.status);
  assert.equal((await C.api('/api/whoami', { cookie: su.ck })).status, 401);
});
test('كوكي الجلسة: HttpOnly · SameSite=Lax · Path=/ · Max-Age · Secure إلا على localhost · لا كوكي عند فشل الدخول · الخروجُ يمحوها', async () => {
  const env = makeEnv(); const C = client(env);
  const r = await C.req('/api/login', { method: 'POST', body: JSON.stringify({ u: 'admin', p: 'admin' }), headers: { 'Content-Type': 'application/json' } });
  const ck = r.headers.get('set-cookie') || ''; assert.match(ck, /^bs_tok=[A-Za-z0-9_-]{20,}; /); assert.match(ck, /HttpOnly/); assert.match(ck, /SameSite=Lax/); assert.match(ck, /Path=\//); assert.match(ck, /Max-Age=\d+/); assert.match(ck, /Secure/, 'Secure على أي مضيفٍ غير localhost (المضيفُ x هنا)');
  const rl = await C.req('/api/login', { method: 'POST', base: 'http://localhost:8787', body: JSON.stringify({ u: 'admin', p: 'admin' }), headers: { 'Content-Type': 'application/json', origin: 'http://localhost:8787' } });
  assert.doesNotMatch(rl.headers.get('set-cookie') || '', /Secure/, 'localhost على http (تطوير) بلا Secure — كي لا تسقط الكوكي بصمت');
  const bad = await C.req('/api/login', { method: 'POST', body: JSON.stringify({ u: 'admin', p: 'wrong1' }), headers: { 'Content-Type': 'application/json' } });
  assert.equal(bad.headers.get('set-cookie'), null, 'لا كوكي عند الفشل');
  const lo = await C.req('/api/logout', { method: 'POST', headers: { cookie: ck.split(';')[0], 'Content-Type': 'application/json' }, body: '{}' });
  assert.match(lo.headers.get('set-cookie') || '', /bs_tok=; .*Max-Age=0/, 'الخروجُ يمحو الكوكي');
});
