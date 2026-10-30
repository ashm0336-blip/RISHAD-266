/* RM-5 · AUD-035 (ب) — ترقيةُ البصمة عند الدخول (p1$ → PBKDF2 p2$) كتابةٌ مرئية (KIVO_253): ترفع رقمَ مراجعة مفتاح الحسابات فيظهر في
   /api/changes، ونسخةُ مدير النظام القديمة (ببصمة p1$ وبرقم مراجعةٍ قديم) تتعارض ولا تُطبَّق — فلا تُنزَّل البصمة ولا تُبطَل جلسةُ صاحبها.
   اكتُشفت في بوابة 253 (cfbench/sec.mjs): كانت الترقيةُ صامتةً فأعاد حفظُ قائمةٍ قديمة البصمةَ القديمة وأبطل الجلسات (AUD-035 منذ 252). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLegacyTestEnv as makeEnv, client, since } from './harness.mjs';
const lh = (p) => { let h = 5381, s = 'bs~' + p + '~gate'; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; let h2 = 52711; for (let j = s.length - 1; j >= 0; j--) h2 = ((h2 << 5) + h2 + s.charCodeAt(j)) | 0; return (h >>> 0).toString(36) + '.' + (h2 >>> 0).toString(36); };
const K = 'bassam_auth_users_v1';
const dbUsers = async (env) => { const r = await env.DB.prepare('SELECT v FROM kv WHERE k = ?1 ORDER BY seq').bind(K).all(); return JSON.parse(r.results.map(x => x.v).join('')); };   /* البصماتُ لا تُقرأ من API (AUD-033) — من القاعدة مباشرة */
const users = () => [
  { id: 'su', un: 'admin', ph: 'p1$' + lh('admin'), name: 'م', role: 'super' },
  { id: 'wr', un: 'writer', ph: 'p1$' + lh('Wrt#11234'), name: 'ك', role: 'staff', deptId: 'A', ekey: 'e_wr' }];
test('دخولُ مستخدمٍ ببصمة p1$ يرقّيها إلى p2$ ويرفع رقمَ مراجعة الحسابات (يظهر في /api/changes)', since(153), async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const s1 = await C.save(su.ck, { [K]: JSON.stringify(users()), 'bassam_depts_v1': JSON.stringify([{ id: 'A', name: 'أ' }]) }); assert.equal(s1.status, 200);
  const r1 = s1.j.revs[K]; assert.ok(r1 > 0);
  const wr = await C.login('writer', 'Wrt#11234'); assert.ok(wr.ok, 'دخولُ الكاتب');
  const g = await C.api('/api/get?keys=' + K, { cookie: su.ck }); const list = await dbUsers(env);
  assert.ok(list.find(u => u.id === 'wr').ph.startsWith('p2$'), 'البصمةُ رُقّيت إلى p2$');
  assert.ok(g.j.keys[K].rev > r1, 'رقمُ المراجعة ارتفع بالترقية: ' + r1 + ' → ' + g.j.keys[K].rev);
  const ch = await C.api('/api/changes?since=' + r1, { cookie: su.ck }); assert.equal(ch.status, 200);
  assert.ok(JSON.stringify(ch.j).indexOf(K) >= 0, 'التغييرُ يصل العملاء عبر /api/changes');
});
test('نسخةُ مدير النظام القديمة (p1$ برقمٍ قديم) تتعارض ولا تُطبَّق: البصمةُ تبقى p2$ وجلسةُ الكاتب حيّة', since(153), async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const s1 = await C.save(su.ck, { [K]: JSON.stringify(users()), 'bassam_depts_v1': JSON.stringify([{ id: 'A', name: 'أ' }]) }); const r1 = s1.j.revs[K];
  const wr = await C.login('writer', 'Wrt#11234'); assert.ok(wr.ok);
  assert.equal((await C.api('/api/whoami', { cookie: wr.ck })).status, 200);
  /* مديرُ النظام يعيد حفظَ قائمته القديمة (قبل الترقية) بالرقم الذي يعرفه */
  const stale = users().map(u => u.id === 'wr' ? { ...u, name: 'كاتب-معدَّل' } : u);
  const s2 = await C.save(su.ck, { [K]: JSON.stringify(stale) }, [], { [K]: r1 });
  assert.equal(s2.status, 200); assert.ok(s2.j.conflicts && s2.j.conflicts[K], 'تعارضٌ معلن (لا كتابةَ عمياء)');
  const list = await dbUsers(env);
  assert.ok(list.find(u => u.id === 'wr').ph.startsWith('p2$'), 'البصمةُ لم تُنزَّل');
  assert.equal((await C.api('/api/whoami', { cookie: wr.ck })).status, 200, 'جلسةُ الكاتب حيّة (لا إبطالَ زائف)');
  /* والدمجُ الصحيح (بأحدث نسخة من الخادم) يمرّ ويبقي البصمةَ والجلسة */
  const fresh = list.map(u => u.id === 'wr' ? { ...u, name: 'كاتب-معدَّل' } : u);
  const s3 = await C.save(su.ck, { [K]: JSON.stringify(fresh) }); assert.equal(s3.status, 200); assert.ok(!(s3.j.conflicts && s3.j.conflicts[K]));
  const l2 = await dbUsers(env);
  assert.equal(l2.find(u => u.id === 'wr').name, 'كاتب-معدَّل'); assert.ok(l2.find(u => u.id === 'wr').ph.startsWith('p2$'));
  assert.equal((await C.api('/api/whoami', { cookie: wr.ck })).status, 200);
});
test('حارسُ الخادم: نسخةٌ قديمة ببصمة p1$ وبرقمٍ حديث (عميلٌ يتجاوز التعارض) لا تُنزّل p2$ ولا تُبطل الجلسة — والتعيينُ المؤقت الجديد (mc) وتغييرُ الحساب لنفسه يمرّان', since(153), async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  await C.save(su.ck, { [K]: JSON.stringify(users()), 'bassam_depts_v1': JSON.stringify([{ id: 'A', name: 'أ' }]) });
  const wr = await C.login('writer', 'Wrt#11234'); assert.ok(wr.ok);
  const before = (await dbUsers(env)).find(u => u.id === 'wr').ph; assert.ok(before.startsWith('p2$'));
  /* (أ) قائمةٌ قديمة (p1$) برقمٍ حديث: تُقبل الحقولُ الأخرى وتبقى البصمةُ المخزَّنة والجلسة */
  const s2 = await C.save(su.ck, { [K]: JSON.stringify(users().map(u => u.id === 'wr' ? { ...u, name: 'ك٢' } : u)) }); assert.equal(s2.status, 200); assert.ok(!(s2.j.conflicts && s2.j.conflicts[K]));
  const l2 = await dbUsers(env); assert.equal(l2.find(u => u.id === 'wr').ph, before, 'p2$ محفوظة'); assert.equal(l2.find(u => u.id === 'wr').name, 'ك٢');
  assert.equal((await C.api('/api/whoami', { cookie: wr.ck })).status, 200, 'الجلسةُ حيّة');
  /* (ب) تعيينٌ مؤقت جديد من مدير النظام (p1$ + mc) يُقبل ويُبطل الجلسة (AUD-035) */
  const s3 = await C.save(su.ck, { [K]: JSON.stringify(l2.map(u => u.id === 'wr' ? { ...u, ph: 'p1$' + lh('Tmp123456'), mc: 1 } : u)) }); assert.equal(s3.status, 200);
  const l3 = await dbUsers(env); assert.equal(l3.find(u => u.id === 'wr').ph, 'p1$' + lh('Tmp123456'), 'التعيينُ المؤقت نافذ');
  assert.equal((await C.api('/api/whoami', { cookie: wr.ck })).status, 401, 'جلسةُ الكاتب أُبطلت بتغيير كلمته');
  const wr2 = await C.login('writer', 'Tmp123456'); assert.ok(wr2.ok, 'الدخولُ بالمؤقتة');
});
