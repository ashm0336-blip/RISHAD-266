/* RM-3 · AUD-005 خطوة ٢ (SOT-048) — CSP بـnonce على العامل الحقيقي (KIVO_253): رأسُ الغلاف script-src 'self' 'nonce-…' بلا 'unsafe-inline' ولا 'unsafe-eval' ·
   السكربتُ المحقون الوحيد (__BS_BOOT) يحمل nonce الرأس نفسَه · <meta> CSP في الغلاف تُعاد كتابتُها بالصيغة نفسِها (script-src بـnonce · default-src بلا 'unsafe-inline') ·
   nonce مختلفٌ لكل طلب · لا سكربتَ مضمَّناً آخر في الغلاف المُقدَّم · style-src كما كانت ('unsafe-inline') · CSP على HTML فقط لا على JSON. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, since, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
const csp = (h) => Object.fromEntries((h.get('content-security-policy') || '').split(';').map(s => s.trim()).filter(Boolean).map(s => { const [k, ...v] = s.split(/\s+/); return [k, v.join(' ')]; }));
const shell = async (C, ck) => { const r = await C.req('/', { cookie: ck, headers: { accept: 'text/html' } }); return { r, t: await r.text(), p: csp(r.headers) }; };
test('غلافُ الزائر والمستخدم: script-src = \'self\' \'nonce-…\' بلا unsafe-inline/eval · السكربتُ المحقون يحمل nonce الرأس · <meta> بالصيغة نفسِها', since(153), async () => {
  const env = makeTestEnv(); const C = client(env);
  const anon = await shell(C);
  assert.equal(anon.r.status, 200);
  const m = /^'self' 'nonce-([A-Za-z0-9+/=]{16,})'$/.exec(anon.p['script-src'] || '');
  assert.ok(m, 'script-src = self + nonce: ' + anon.p['script-src']);
  const n = m[1];
  assert.ok(!/unsafe-inline|unsafe-eval/.test(anon.p['script-src']), 'لا unsafe-* في script-src');
  assert.equal(anon.p['style-src'], "'self' 'unsafe-inline'", 'style-src كما كانت');
  assert.equal(anon.p['object-src'], "'none'"); assert.equal(anon.p['frame-ancestors'], "'self'");
  const scripts = [...anon.t.matchAll(/<script\b([^>]*)>/g)].map(x => x[1]);
  const inline = scripts.filter(a => !/\ssrc=/.test(a) && !/type="text\/x-dc"/.test(a));
  assert.equal(inline.length, 1, 'سكربتٌ مضمَّن واحد (__BS_BOOT): ' + inline.join(' | '));
  assert.ok(new RegExp('nonce="' + n.replace(/[+/=]/g, '\\$&') + '"').test(inline[0]), 'السكربتُ المحقون يحمل nonce الرأس نفسَه: ' + inline[0]);
  assert.ok(anon.t.indexOf('window.__BS_BOOT=') > 0, 'الإقلاعُ محقون');
  const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(anon.t);
  assert.ok(meta, 'meta CSP موجودة');
  assert.ok(meta[1].indexOf("script-src 'self' 'nonce-" + n + "'") >= 0, 'meta: script-src بـnonce الطلب نفسِه: ' + meta[1]);
  assert.ok(!/default-src[^;]*unsafe-inline/.test(meta[1]), 'meta: default-src بلا unsafe-inline');
  assert.ok(/style-src 'self' 'unsafe-inline'/.test(meta[1]) && /object-src 'none'/.test(meta[1]) && /base-uri 'self'/.test(meta[1]), 'meta: بقيةُ التوجيهات كما كانت');
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  const user = await shell(C, su.ck);
  const m2 = /'nonce-([A-Za-z0-9+/=]+)'/.exec(user.p['script-src'] || ''); assert.ok(m2);
  assert.ok(user.t.indexOf('nonce="' + m2[1] + '"') > 0 && user.t.indexOf('"srv":1') > 0, 'غلافُ المستخدم: nonce الرأس في السكربت المحقون مع بيانات الإقلاع');
});
test('nonce مختلفٌ لكل طلب (16 بايتاً عشوائية) · لا CSP على ردود JSON · الأصولُ عبر العامل بلا CSP', since(153), async () => {
  const env = makeTestEnv(); const C = client(env);
  const a = await shell(C), b = await shell(C), c = await shell(C);
  const ns = [a, b, c].map(x => /'nonce-([^']+)'/.exec(x.p['script-src'])[1]);
  assert.equal(new Set(ns).size, 3, 'ثلاثةُ طلبات = ثلاثةُ nonce: ' + ns.join(','));
  assert.ok(ns.every(x => Buffer.from(x, 'base64').length === 16), '16 بايتاً لكل nonce');
  const j = await C.api('/api/brand'); assert.equal(j.status, 200); assert.equal(j.h.get('content-security-policy'), null, 'JSON بلا CSP');
  const r404 = await C.req('/no-such-asset.js'); assert.ok(r404.headers.get('content-security-policy') === null || r404.status !== 200, 'الأصلُ غيرُ HTML بلا CSP');
});
