/* ══ KIVO_255 · AUD-037 (SOT-149) — جولاتُ D1 لكل طلبٍ مصادَق ══
   الكمونُ على Preview (≈ 1.2 s وسيطاً للمسارات المصادَقة) كان عدداً من جولات D1 المتسلسلة من الحافة إلى موقع القاعدة لا حجمَ بيانات.
   هنا تُعدّ الجولاتُ نفسُها في بديل D1 (harness: كلُّ first/all/run/raw جولة · batch جولةٌ واحدة) وتُحكم بسقفٍ لكل مسار —
   فأيُّ عودةٍ للقراءة المتسلسلة تُسقط الاختبار، وقياسُ الزمن الحقيقي يكون على Preview بعد النشر (verify_255). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, since, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
const S255 = since(155);
const DEPT = 'bassam_depts_v1', PLAN = 'bassam_gdepts_v1';   /* مفتاحان يكتبهما مدير النظام في الوضع القديم (مفاتيحُ الإدارات تحتاج إدارةً) */
async function ready() {
  const env = makeTestEnv(); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'دخول مدير النظام (قاعدة جديدة)');
  const s = await C.save(su.ck, { [DEPT]: JSON.stringify([{ id: 'dA', name: 'إدارة', gid: '' }]), [PLAN]: JSON.stringify([{ id: 'g1', name: 'قطاع' }]) }); assert.equal(s.status, 200); assert.equal(s.j.ok, 1); assert.ok(s.j.revs[DEPT] && s.j.revs[PLAN], 'الحفظُ قُبل للمفتاحين');
  await C.api('/api/ping');   /* التهيئةُ (initDb) اكتملت قبل العدّ */
  return { env, C, ck: su.ck };
}
const count = async (env, fn) => { env.DB.trips = 0; const r = await fn(); return { trips: env.DB.trips, r }; };

test('الغلافُ بجلسة: ≤ 4 جولات (اللقطةُ · kv كلُّها · لمسُ الجلسة إن لزم) — كانت ≈ 8 متسلسلة', S255, async () => {
  const { env, C, ck } = await ready();
  const { trips, r } = await count(env, () => C.boot(ck));
  assert.equal(r.status, 200); assert.ok(r.boot && r.boot.uid, 'الإقلاعُ بجلسة');
  assert.ok(trips <= 4, 'جولاتُ الغلاف بجلسة = ' + trips + ' (السقف 4)');
});
test('/api/get لخمسة مفاتيح: ≤ 3 جولات (اللقطةُ · القيمُ معاً · المراجعات من اللقطة) — كانت 9 + مفتاح', S255, async () => {
  const { env, C, ck } = await ready();
  const keys = [DEPT, PLAN, 'bassam_perms_v1', 'bassam_gdepts_v1', 'bassam_platform_v1'];
  const { trips, r } = await count(env, () => C.api('/api/get?keys=' + encodeURIComponent(keys.join(',')), { cookie: ck }));
  assert.equal(r.status, 200); assert.equal(r.j.ok, 1); assert.ok(r.j.keys[DEPT] && r.j.keys[DEPT].v, 'القيمُ وصلت');
  assert.ok(trips <= 3, 'جولاتُ /api/get = ' + trips + ' (السقف 3)');
});
test('/api/changes (بلا انتظار) ≤ 3 جولات · /api/me ≤ 2 (استعلاماتُه الثلاثة في دفعة)', S255, async () => {
  const { env, C, ck } = await ready();
  const a = await count(env, () => C.api('/api/changes?since=0', { cookie: ck })); assert.equal(a.r.status, 200); assert.ok(a.trips <= 3, '/api/changes = ' + a.trips);
  const b = await count(env, () => C.api('/api/me', { cookie: ck })); assert.equal(b.r.status, 200, '/api/me ' + b.r.status); assert.ok(b.r.j.sessions || b.r.j.sess || b.r.j.ok, 'ردُّ /api/me'); assert.ok(b.trips <= 2, '/api/me = ' + b.trips);
});
test('الدلالة محفوظة: كتابةٌ داخل الطلب تُطفئ اللقطة — /api/save يعيد رقمَ المراجعة الجديد والقراءةُ التالية تراه', S255, async () => {
  const { C, ck } = await ready();
  const g0 = await C.api('/api/changes?since=0', { cookie: ck }); const v0 = g0.j.v;
  const s1 = await C.save(ck, { [PLAN]: JSON.stringify([{ id: 'g1', name: 'قطاعٌ معدَّل' }]) }); assert.equal(s1.status, 200); assert.equal(s1.j.ok, 1); assert.ok(s1.j.revs[PLAN], 'قُبل');
  assert.ok(s1.j.v > v0, 'رقمُ المراجعة بعد الحفظ أحدث (' + s1.j.v + ' > ' + v0 + ') — لا رقمَ قديماً من اللقطة');
  const g1 = await C.api('/api/get?keys=' + PLAN, { cookie: ck }); assert.equal(JSON.parse(g1.j.keys[PLAN].v)[0].name, 'قطاعٌ معدَّل');
  assert.equal(g1.j.v, s1.j.v, 'القراءةُ التالية ترى المراجعةَ نفسَها');
});
test('الدلالة محفوظة: انتظارُ /api/changes?wait=1 يرى تغييراً وقع أثناءه (يقرأ حيّاً لا من اللقطة)', S255, async () => {
  const { C, ck } = await ready();
  const g0 = await C.api('/api/changes?since=0', { cookie: ck }); const v0 = g0.j.v;
  const waiting = C.api('/api/changes?since=' + v0 + '&wait=1', { cookie: ck });
  await new Promise(r => setTimeout(r, 300));
  const s1 = await C.save(ck, { [PLAN]: JSON.stringify([{ id: 'g1', name: 'قطاعٌ ثالث' }]) }); assert.equal(s1.j.ok, 1); assert.ok(s1.j.revs[PLAN], 'قُبل');
  const w = await waiting; assert.equal(w.status, 200); assert.ok(w.j.v >= s1.j.v, 'الانتظارُ انتهى برقم المراجعة الجديد (' + w.j.v + ')');
});
test('الدلالة محفوظة: جلسةٌ أُبطلت أثناء الطلب التالي تُرفض — صفُّ الجلسة من اللقطة يُجلب بالرمز نفسِه في الطلب نفسِه', S255, async () => {
  const { env, C, ck } = await ready();
  const ok1 = await C.api('/api/changes?since=0', { cookie: ck }); assert.equal(ok1.status, 200);
  env.DB.exec("DELETE FROM sess");
  const no = await C.api('/api/changes?since=0', { cookie: ck }); assert.equal(no.status, 401, 'لا جلسةَ بعد الحذف — لا لقطةَ عبر الطلبات');
});
test('تعذّرُ اللقطة لا يغيّر السلوك: عطلٌ في دفعة المقدّمة ⇒ القراءاتُ المباشرة كما قبل 255 (الطلبُ يُخدم)', S255, async () => {
  const { env, C, ck } = await ready();
  env.DB.failIf = (sql) => /FROM kv WHERE k IN \(/.test(sql) && /ORDER BY k, seq/.test(sql) && !/WHERE 0/.test(sql);
  const r = await C.api('/api/changes?since=0', { cookie: ck });
  assert.equal(r.status, 200, 'يُخدم بالقراءات المباشرة');
  env.DB.failIf = null;
});
