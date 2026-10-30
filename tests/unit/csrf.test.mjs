/* ══ KIVO_255 · SOT-138 — CSRF / Origin / Cross-site: حالاتُ الاختبار الصريحة ══
   القاعدة (الخادم): كلُّ طلبٍ مغيِّر (POST/PUT/DELETE) يُرفض 403 إن حمل Origin مختلفاً عن الموقع أو Sec-Fetch-Site: cross-site —
   قبل أيّ قراءةٍ للجسم أو للجلسة؛ والكوكي HttpOnly · SameSite=Lax · Secure (خارج localhost). هنا الحالاتُ باسمها: origin مزوّر · بلا Origin
   (عميلٌ غيرُ متصفح — يُقبل) · same-site · cross-site بلا Origin · الخروجُ والحفظُ والدخولُ وتغييرُ كلمة المرور · القراءةُ GET لا تتأثر (الكوكي Lax لا يُرسَل أصلاً). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLegacyTestEnv as makeEnv, client, worker } from './harness.mjs';
const BASE = 'http://x';
async function rawPost(env, p, body, headers, cookie) {
  const w = await worker(env); const h = Object.assign({ 'Content-Type': 'application/json' }, headers || {}); if (cookie) h.cookie = cookie;
  const r = await w.fetch(new Request(BASE + p, { method: 'POST', headers: h, body: JSON.stringify(body || {}) }), env);
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, j, h: r.headers };
}
async function ready() { const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok); return { env, C, ck: su.ck }; }

test('الكوكي: HttpOnly · SameSite=Lax · Path=/ · Secure خارج localhost', async () => {
  const env = makeEnv(); const w = await worker(env);
  const r = await w.fetch(new Request('https://kivo.example/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'https://kivo.example' }, body: JSON.stringify({ u: 'admin', p: 'admin' }) }), env);
  const sc = r.headers.get('set-cookie') || ''; assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Lax/); assert.match(sc, /Secure/); assert.match(sc, /Path=\//);
  const w2 = await worker(env);
  const local = await w2.fetch(new Request('http://localhost:8788/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://localhost:8788' }, body: JSON.stringify({ u: 'admin', p: 'admin' }) }), env);
  const sl = local.headers.get('set-cookie') || ''; assert.match(sl, /HttpOnly/); assert.match(sl, /SameSite=Lax/); assert.ok(!/Secure/.test(sl), 'على localhost وحده (خادمُ التطوير) بلا Secure');
  const nonlocal = await rawPost(env, '/api/login', { u: 'admin', p: 'admin' }, { origin: BASE });
  assert.match(nonlocal.h.get('set-cookie') || '', /Secure/, 'أيُّ مضيفٍ غيرِ localhost — ولو http — يحمل Secure');
});
test('origin مزوّر على الحفظ ⇒ 403 origin قبل الجلسة والجسم — لا تغييرَ على الخادم', async () => {
  const { env, C, ck } = await ready();
  const g0 = await C.api('/api/changes?since=0', { cookie: ck }); const v0 = g0.j.v;
  const r = await rawPost(env, '/api/save', { set: { bassam_depts_v1: '[]' }, del: [], base: {} }, { origin: 'https://evil.example' }, ck);
  assert.equal(r.status, 403); assert.equal(r.j.err, 'origin'); assert.match(r.j.rid, /^[0-9a-f]{12}$/);
  const g1 = await C.api('/api/changes?since=0', { cookie: ck }); assert.equal(g1.j.v, v0, 'رقمُ المراجعة لم يتغيّر');
});
test('Sec-Fetch-Site: cross-site (ولو بلا Origin) ⇒ 403 · same-site/same-origin ⇒ يمرّ', async () => {
  const { env, ck } = await ready();
  const a = await rawPost(env, '/api/logout', {}, { 'sec-fetch-site': 'cross-site' }, ck); assert.equal(a.status, 403, 'الخروجُ عبر موقعٍ آخر يُرفض');
  const b = await rawPost(env, '/api/changes?since=0', {}, { origin: BASE, 'sec-fetch-site': 'same-origin' }, ck); assert.notEqual(b.status, 403, 'same-origin يمرّ (' + b.status + ')');
});
test('بلا Origin وبلا Sec-Fetch-Site (عميلٌ غيرُ متصفح/أداة): يُقبل — الكوكي HttpOnly لا يصل إلا من المتصفح نفسِه', async () => {
  const { env, ck } = await ready();
  const r = await rawPost(env, '/api/changes?since=0', {}, {}, ck); assert.notEqual(r.status, 403);
});
test('الحالاتُ الحساسة عبر موقعٍ آخر: الدخول · تغييرُ كلمة المرور · الخروج · الحفظ — كلُّها 403 بلا أثر', async () => {
  const { env, C, ck } = await ready();
  for (const [p, body] of [['/api/login', { u: 'admin', p: 'admin' }], ['/api/checkpw', { pw: 'x' }], ['/api/logout', {}], ['/api/save', { set: {}, del: [], base: {} }], ['/api/reset', {}], ['/api/policy', { sessH: 1 }]]) {
    const r = await rawPost(env, p, body, { origin: 'https://evil.example' }, ck); assert.equal(r.status, 403, p + ' ⇒ 403'); assert.equal(r.j.err, 'origin');
  }
  const me = await C.api('/api/changes?since=0', { cookie: ck }); assert.equal(me.status, 200, 'الجلسةُ ما زالت صالحة — لم يُنفَّذ خروج');
});
test('القراءة GET بأصلٍ مختلف لا تُرفض بالأصل (SameSite=Lax يمنع إرسالَ الكوكي من موقعٍ آخر أصلاً) — وبلا كوكي تردّ 401', async () => {
  const { env } = await ready(); const w = await worker(env);
  const r = await w.fetch(new Request(BASE + '/api/changes?since=0', { headers: { origin: 'https://evil.example' } }), env);
  assert.equal(r.status, 401);
});
