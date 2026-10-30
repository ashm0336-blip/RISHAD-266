/* RM-5 · SOT-139 — سياسةُ المعدّل وحمايةُ الدخول على العامل الحقيقي: سقفُ الحفظ لكل حساب في الدقيقة (RL_SAVE=1200 — مقيسٌ: ضِعفُ أسوأ حملٍ مشروع 613/د) ⇒ 429 مع Retry-After
   · النافذةُ دقيقةٌ منزلقة بالتقويم (تُفتح جديدةٌ في الدقيقة التالية) · العدُّ ذرّيٌّ (INSERT … RETURNING) · قفلُ الدخول: LOCK_N محاولات على المصدر والزوج ثم مهلةٌ متضاعفة
   (حتى lockMin) ويُسجَّل lock في sec · كلمةٌ صحيحة من مصدرٍ سليم تدخل رغم قفل مصدرٍ آخر · السياسةُ (lockN · lockMin) قابلةٌ للضبط وتسري فوراً · فكُّ القفل إدارياً. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLegacyTestEnv as makeEnv, client } from './harness.mjs';
test('سقفُ الحفظ: الطلبُ رقم RL_SAVE+1 في الدقيقة نفسِها ⇒ 429 وRetry-After ≤ 60 · الحسابُ الآخر لا يتأثر · الدقيقةُ التالية تفتح نافذةً جديدة', async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const win = Math.floor(Date.now() / 60000); env.DB.exec(`INSERT INTO guard (gk, n, until) VALUES ('rl:sv:su:${win}', 1199, ${(win + 1) * 60000})`);   /* 1199 حفظةً مضت في هذه الدقيقة */
  const a = await C.api('/api/save', { method: 'POST', cookie: su.ck, body: { set: {}, del: [], base: {} } }); assert.equal(a.status, 200, 'الحفظةُ 1200 تمرّ');
  const b = await C.api('/api/save', { method: 'POST', cookie: su.ck, body: { set: {}, del: [], base: {} } }); assert.equal(b.status, 429); assert.ok(+b.h.get('Retry-After') >= 1 && +b.h.get('Retry-After') <= 60, 'Retry-After ' + b.h.get('Retry-After')); assert.equal(b.j.retry, +b.h.get('Retry-After')); assert.match(b.j.err, /طلباتٌ كثيرة/);
  assert.equal(env.DB.q("SELECT n FROM guard WHERE gk = ?", 'rl:sv:su:' + win)[0].n, 1201, 'العدُّ ذرّي');
  env.DB.exec(`UPDATE guard SET gk = 'rl:sv:su:${win - 1}', until = ${win * 60000} WHERE gk = 'rl:sv:su:${win}'`);   /* كأنّ الدقيقةَ انقضت */
  const c = await C.api('/api/save', { method: 'POST', cookie: su.ck, body: { set: {}, del: [], base: {} } }); assert.equal(c.status, 200, 'نافذةٌ جديدة');
});
test('قفلُ الدخول: 5 محاولاتٍ خاطئة من مصدرٍ تقفله (lock في sec) · الحسابُ يدخل بكلمته من مصدرٍ آخر · المهلةُ تتضاعف ولا تتجاوز lockMin · السياسةُ lockN=3 تسري · الفكُّ الإداري', async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin');
  const ip = (x) => ({ 'CF-Connecting-IP': x });
  for (let i = 0; i < 5; i++) { const r = await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'wrong' + i }, headers: ip('9.9.9.9') }); assert.equal(r.j.ok, 0); }
  const locked = await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' }, headers: ip('9.9.9.9') }); assert.equal(locked.j.ok, 0, 'المصدرُ مقفول حتى بكلمةٍ صحيحة'); assert.match(locked.j.err || '', /انتظر|محاولات|مقفل|ثانية|دقيقة/);
  assert.ok(env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act = 'lock'")[0].n >= 1, 'lock مسجَّل');
  const fine = await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' }, headers: ip('8.8.8.8') }); assert.equal(fine.j.ok, 1, 'مصدرٌ سليم يدخل');
  const g = env.DB.q("SELECT gk, n, until FROM guard WHERE gk LIKE 'ip:%' OR gk LIKE 'p:%'"); assert.ok(g.every(x => x.until <= Date.now() + 5 * 60000 + 1000), 'المهلةُ ≤ lockMin (5 د): ' + JSON.stringify(g));
  const p = await C.api('/api/policy', { method: 'POST', cookie: su.ck, body: { lockN: 3, lockMin: 1 } }); assert.equal(p.j.ok, 1);
  for (let i = 0; i < 3; i++) await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'bad' + i }, headers: ip('7.7.7.7') });
  const l3 = await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' }, headers: ip('7.7.7.7') }); assert.equal(l3.j.ok, 0, 'lockN=3 يسري فوراً');
  const gl = (await C.api('/api/guard', { cookie: su.ck })).j; assert.ok(gl.ok === 1 && (gl.rows || []).some(x => x.locked), 'مدير النظام يرى الأقفال: ' + JSON.stringify(gl).slice(0, 120));
  const keys = env.DB.q("SELECT gk FROM guard WHERE gk LIKE 'ip:7.7.7.7%' OR gk LIKE 'p:%7.7.7.7'").map(x => x.gk);
  for (const gk of keys) { const u = await C.api('/api/guard/unlock', { method: 'POST', cookie: su.ck, body: { gk } }); assert.equal(u.j.ok, 1, 'فكّ ' + gk + ': ' + JSON.stringify(u.j).slice(0, 80)); }
  const after = await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' }, headers: ip('7.7.7.7') }); assert.equal(after.j.ok, 1, 'بعد الفكّ يدخل');
});
test('حدودُ الجسم: /api/save 8 MB · الصور 512 KB (Content-Length) · والطلبُ المقطَّع يُحدّ بعد القراءة', async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin');
  const a = await C.api('/api/save', { method: 'POST', cookie: su.ck, body: '{}', headers: { 'Content-Length': String(8 * 1024 * 1024 + 1) } }); assert.equal(a.status, 413);
  const b = await C.api('/api/img/abc', { method: 'POST', cookie: su.ck, body: '{}', headers: { 'Content-Length': String(512 * 1024 + 1) } }); assert.equal(b.status, 413);
  const big = JSON.stringify({ set: { 'bsdept:dR:bassam_options_v1': 'x'.repeat(8 * 1024 * 1024) }, del: [], base: {} });
  const c = await C.req('/api/save', { method: 'POST', body: big, headers: { cookie: su.ck, 'Content-Type': 'application/json', origin: 'http://x', 'Transfer-Encoding': 'chunked' } }); assert.equal(c.status, 413, 'المقطَّع يُحدّ بعد القراءة: ' + c.status);
});
