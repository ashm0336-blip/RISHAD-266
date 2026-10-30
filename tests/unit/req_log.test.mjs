/* ══ KIVO_255 · SOT-143/149 (SOT-142/144) — سطرُ الطلب في السجل المنظَّم ورأسُ Server-Timing ══
   لكل طلب /api/* ولكل غلاف HTML سطرٌ واحد ev=req: { rid, m, p (المسارُ بلا استعلام), st, dur } — بلا هوية (لا uid/un/ip ولا قيم)؛
   وSever-Timing: app;dur=<ms> على الردّ — أساسُ المقاييس التقنية (المعدّل · الأخطاء · p50/p95) وفصلُ زمن الخادم عن الشبكة. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, makeEnv, TEST_SUPER_USERNAME, TEST_SUPER_PIN, client, since } from './harness.mjs';
const S255 = since(155);
function capture() { const rows = []; const o = console.log; console.log = (s) => { try { const j = JSON.parse(s); if (j.ev === 'req') rows.push(j); } catch (e) {} }; return { rows, stop: () => { console.log = o; } }; }
test('ev=req لكل طلب API وللغلاف: المسارُ بلا استعلام · st · dur رقم · rid = الرأس · بلا هوية', S255, async () => {
  const env = makeTestEnv(); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  const cap = capture(); let r, b;
  try { r = await C.api('/api/get?keys=bassam_auth_users_v1', { cookie: su.ck }); b = await C.req('/', { cookie: su.ck, headers: { accept: 'text/html' } }); } finally { cap.stop(); }
  assert.equal(r.status, 200);
  const e = cap.rows.filter(x => x.p === '/api/get'); assert.equal(e.length, 1, 'سطرٌ واحد للطلب');
  assert.equal(e[0].m, 'GET'); assert.equal(e[0].st, 200); assert.equal(typeof e[0].dur, 'number'); assert.ok(e[0].dur >= 0 && e[0].dur < 10000);
  assert.equal(e[0].rid, r.h.get('X-Kivo-Rid'), 'rid = رأسُ الردّ');
  assert.ok(!('uid' in e[0]) && !('un' in e[0]) && !('ip' in e[0]) && !('q' in e[0]) && !/keys=/.test(JSON.stringify(e[0])), 'لا هويةَ ولا استعلام');
  assert.deepEqual(Object.keys(e[0]).sort(), ['dur', 'ev', 'lvl', 'm', 'p', 'rid', 'st', 't', 'v', 'ver'], 'الحقولُ المحدَّدة فقط');
  const sh = cap.rows.filter(x => x.p === '/'); assert.equal(sh.length, 1, 'سطرٌ للغلاف'); assert.equal(sh[0].st, 200);
  assert.match(r.h.get('Server-Timing') || '', /^app;dur=\d+$/, 'Server-Timing على ردّ API');
  assert.match(b.headers.get('Server-Timing') || '', /^app;dur=\d+$/, 'Server-Timing على الغلاف');
});
test('لا سطرَ req للأصول الثابتة (ليست /api/* ولا HTML)', S255, async () => {
  const env = makeTestEnv(); const C = client(env);
  const cap = capture(); let r;
  try { r = await C.req('/robots.txt'); } finally { cap.stop(); }
  assert.equal(r.status, 200); assert.equal(cap.rows.length, 0);
});
