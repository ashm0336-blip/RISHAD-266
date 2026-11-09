/* ══ KIVO_255 · SOT-139 — حدُّ معدّل الكتابة لكل حساب: نافذةُ دقيقة ذرّية (INSERT…RETURNING) · السياسة wrMin (30..5000 · الافتراضي 1200 المقيس) ══
   يُثبت: (أ) الافتراضي 1200 في السياسة وتحت السقف لا أثر؛ (ب) بسقف 30: الحفظُ الـ31 ⇒ 429 {ok:0, err, retry} + Retry-After بلا كتابة، والقراءاتُ لا تُحدّ؛
   (ج) نافذةٌ جديدة تعيد العدّ (زمنٌ مثبَّت)؛ (د) رفعُ الصور بسقفٍ مستقل = ربع سقف الحفظ (الحدُّ الأدنى 30) ولا يستهلك عدَّ الحفظ؛
   (هـ) نوافذُ rl: ليست أقفالاً: لا تظهر في /api/guard ولا تُحتسب في lockedNow؛ (و) حسابٌ آخر غيرُ متأثّر (العدُّ لكل حساب). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLegacyTestEnv as makeEnv, client, worker, since } from './harness.mjs';
const S255 = since(155);
const DEPT = 'bassam_depts_v1';
/* الزمنُ مثبَّت داخل نافذةٍ واحدة (بدايةُ الدقيقة + 1 ث) كي لا يعبر الاختبارُ حدَّ النافذة أثناء تنفيذه؛ يتقدّم 10 ms لكل نداء */
function freezeClock() { const real = Date.now; let base = Math.floor(real() / 60000) * 60000 + 1000, k = 0; Date.now = () => base + (k++) * 10; return { release: () => { Date.now = real; }, jump: (ms) => { base += ms; } }; }
async function ready(wrMin) {
  const env = makeEnv(); const C = client(env);
  const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  if (wrMin) { const p = await C.api('/api/policy', { method: 'POST', body: { sessH: 12, idleH: 2, lockN: 5, lockMin: 5, pwMin: 6, wrMin }, cookie: su.ck }); assert.equal(p.j.ok, 1); assert.equal(p.j.policy.wrMin, Math.max(30, wrMin)); }
  return { env, C, ck: su.ck };
}
const saveRaw = (C, ck, name) => C.api('/api/save', { method: 'POST', body: { set: { [DEPT]: JSON.stringify([{ id: 'dA', name, gid: '' }]) }, del: [], base: { [DEPT]: 0 } }, cookie: ck });

test('(أ) الافتراضي wrMin=1200 في السياسة · 40 حفظاً سريعاً تمرّ · السقفُ المنخفض يُرفض دون 30', S255, async () => {
  const { C, ck } = await ready(0);
  const p = await C.api('/api/policy', { cookie: ck }); assert.equal(p.j.policy.wrMin, 1200);
  for (let i = 0; i < 40; i++) { const s = await C.save(ck, { [DEPT]: JSON.stringify([{ id: 'dA', name: 'إدارة ' + i, gid: '' }]) }); assert.equal(s.status, 200, 'الحفظ ' + i); }
  /* CORE-02 (B2): ما دون 30 يُرفض باسمه (400 policy-invalid) والسياسةُ كما هي — كان يُرفع إلى 30 بصمتٍ مع «حُفظت» */
  const low = await C.api('/api/policy', { method: 'POST', body: { sessH: 12, idleH: 2, lockN: 5, lockMin: 5, pwMin: 6, wrMin: 5 }, cookie: ck });
  assert.equal(low.status, 400); assert.equal(low.j.err, 'policy-invalid'); assert.equal(low.j.field, 'wrMin'); assert.equal(low.j.min, 30);
  assert.equal((await C.api('/api/policy', { cookie: ck })).j.policy.wrMin, 1200, 'الحدُّ الأدنى 30 — والمرفوضُ لا يغيّر شيئاً');
});
test('(ب)(ج) سقف 30: الحفظُ الـ31 ⇒ 429 بلا كتابة · القراءاتُ لا تُحدّ · نافذةٌ جديدة تعيد العدّ', S255, async () => {
  const clk = freezeClock(); try {
    const { C, ck } = await ready(30);
    for (let i = 0; i < 30; i++) { const s = await C.save(ck, { [DEPT]: JSON.stringify([{ id: 'dA', name: 'ن' + i, gid: '' }]) }); assert.equal(s.status, 200, 'الحفظ ' + (i + 1)); }
    const g0 = await C.api('/api/get?keys=' + DEPT, { cookie: ck }); const rev0 = g0.j.keys[DEPT].rev;
    const s31 = await saveRaw(C, ck, 'مرفوض');
    assert.equal(s31.status, 429); assert.equal(s31.j.ok, 0); assert.ok(s31.j.retry >= 1 && s31.j.retry <= 60, 'retry ' + s31.j.retry); assert.equal(s31.h.get('Retry-After'), String(s31.j.retry));
    const g1 = await C.api('/api/get?keys=' + DEPT, { cookie: ck }); assert.equal(g1.j.keys[DEPT].rev, rev0, 'لا كتابة'); assert.notEqual(JSON.parse(g1.j.keys[DEPT].v)[0].name, 'مرفوض');
    for (const p of ['/api/changes?since=0', '/api/me', '/api/aud?limit=3']) { const r = await C.api(p, { cookie: ck }); assert.equal(r.status, 200, p + ' قراءةٌ بلا حدّ'); }
    clk.jump(60000);
    const s32 = await C.save(ck, { [DEPT]: JSON.stringify([{ id: 'dA', name: 'نافذةٌ جديدة', gid: '' }]) }); assert.equal(s32.status, 200, 'نافذةٌ جديدة تعيد العدّ');
  } finally { clk.release(); }
});
test('(د)(هـ) رفعُ الصور: سقفٌ مستقل = max(30, wrMin/4) ولا يستهلك عدَّ الحفظ · نوافذُ rl: لا تظهر أقفالاً ولا تُحتسب في lockedNow', S255, async () => {
  const clk = freezeClock(); try {
    const { env, C, ck } = await ready(120);   /* الصور: 30 في الدقيقة */
    /* KIVO_261 (إفصاح — تعديلُ اختبار · SOT-068): الصورةُ بصيغة العميل (data:image/…) — البايتاتُ الخام صارت 415؛ العدُّ والسقفُ قيدُ الفحص كما هما */
    const w = await worker(env); const png = 'data:image/png;base64,' + 'A'.repeat(32);
    const put = (i) => w.fetch(new Request('http://x/api/img/im' + i, { method: 'PUT', headers: { cookie: ck, origin: 'http://x', 'Content-Type': 'text/plain; charset=utf-8' }, body: png }), env);
    for (let i = 0; i < 30; i++) { const r = await put(i); assert.equal(r.status, 200, 'صورة ' + (i + 1)); }
    const r31 = await put(31); assert.equal(r31.status, 429, 'الصورةُ الـ31 تُرفض'); assert.equal(r31.headers.get('Retry-After'), String((await r31.json()).retry));
    const s = await C.save(ck, { [DEPT]: JSON.stringify([{ id: 'dA', name: 'الحفظُ مستقل', gid: '' }]) }); assert.equal(s.status, 200, 'الحفظُ له عدُّه المستقل');
    const gl = await C.api('/api/guard', { cookie: ck }); assert.equal(gl.status, 200); assert.ok(!gl.j.rows.some(r => String(r.gk).startsWith('rl:')), 'لا صفَّ rl: في قائمة الأقفال');
    assert.ok(env.DB.q("SELECT COUNT(*) AS n FROM guard WHERE gk LIKE 'rl:%'")[0].n >= 2, 'نافذتا العدّ في الجدول');
    const ov = await C.api('/api/overview', { cookie: ck }); assert.equal(ov.j.lockedNow, 0, 'lockedNow لا يحتسب نوافذَ المعدّل');
  } finally { clk.release(); }
});
test('(و) العدُّ لكل حساب: حسابٌ ثانٍ (موظف) غيرُ متأثّر بسقف المدير المستنفَد', S255, async () => {
  const clk = freezeClock(); try {
    const { env, C, ck } = await ready(30);
    const users = JSON.parse((await C.api('/api/get?keys=bassam_auth_users_v1', { cookie: ck })).j.keys.bassam_auth_users_v1.v);
    const dep = await C.save(ck, { [DEPT]: JSON.stringify([{ id: 'dA', name: 'إدارة', gid: '' }]) }); assert.equal(dep.j.ok, 1);
    const sv = await C.save(ck, { bassam_auth_users_v1: JSON.stringify(users.concat([{ id: 'e1', un: '0500000001', ph: '', role: 'staff', deptId: 'dA', mc: 0, dis: 0 }])) }); assert.equal(sv.j.ok, 1, 'إضافةُ موظف');
    /* تفعيلُ الموظف بكلمةٍ أولى يمرّ من /api/login (mc) — يكفي هنا أن طلباً مصادَقاً للموظف لا يُحدّ بعدّ المدير */
    for (let i = 0; i < 28; i++) { const s = await C.save(ck, { [DEPT]: JSON.stringify([{ id: 'dA', name: 'ن' + i, gid: '' }]) }); assert.equal(s.status, 200); }
    const blocked = await saveRaw(C, ck, 'x'); assert.equal(blocked.status, 429, 'المدير استنفد سقفَه');
    const e = await C.login('0500000001', '');
    /* حسابٌ بلا كلمةٍ بعد (mc) قد يُرفض الدخولُ أو يُطلب تعيينُ كلمة — المهمّ: 401/200 لا 429 */
    assert.notEqual(e.status, 429, 'دخولُ الموظف ليس محدوداً بعدّ المدير (' + e.status + ')');
    assert.ok(env.DB.q("SELECT n FROM guard WHERE gk LIKE 'rl:sv:%'").length === 1, 'نافذةُ عدٍّ واحدة — للمدير وحده');
  } finally { clk.release(); }
});

/* ══ KIVO_259 (إصلاح — كشفه التدقيقُ المستقل): pwMin لا يُقفل مديرَ النظام ══
   قاعدةُ المنصة (pwCheck): رقمُ مدير النظام 6 أرقام بالضبط. كانت شاشةُ السياسات تقبل pwMin حتى 32 فيصير كلُّ رقمٍ غيرَ صالح:
   الدخولُ يفرض التغيير بلا مخرج، والاستعادةُ بالمفتاح والتهيئةُ ترفضان أيَّ رقم. الآن pwMin ثابتٌ 6 — في الحفظ، وفي قيمةٍ مخزَّنةٍ قبلُ أكبر منه. */
const S259 = since(159);
test('pwMin > 6 لا يُقفل مدير النظام: يُحفظ ويُعاد 6 · قيمةٌ مخزَّنة 12 تُقرأ 6 · الاستعادةُ بمفتاحٍ ورقمٍ من 6 أرقام تنجح · الدخولُ بالرقم الجديد', S259, async () => {
  const env = makeEnv(); const C = client(env);
  const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const p = await C.api('/api/policy', { method: 'POST', body: { sessH: 12, idleH: 2, lockN: 5, lockMin: 5, pwMin: 12, wrMin: 1200 }, cookie: su.ck });
  assert.equal(p.j.ok, 1); assert.equal(p.j.policy.pwMin, 6, 'يُحفظ 6 مهما كان المدخل');
  /* قيمةٌ قديمةٌ مخزَّنة أكبر من 6 (حُفظت قبل الإصلاح): تُقرأ 6 في عزلةٍ جديدة */
  env.DB.exec("UPDATE meta SET v = '{\"sessH\":12,\"idleH\":2,\"lockN\":5,\"lockMin\":5,\"pwMin\":12,\"wrMin\":1200}' WHERE k = 'policy'");
  const env2 = Object.assign({}, env); delete env2.__worker; const C2 = client(env2);
  const su2 = await C2.login('admin', 'admin'); assert.ok(su2.ok);
  const g = await C2.api('/api/policy', { cookie: su2.ck }); assert.equal(g.j.policy.pwMin, 6, 'القيمةُ المخزَّنة 12 تُقرأ 6');
  const rk = await C2.api('/api/recovery/new', { method: 'POST', cookie: su2.ck, body: { pw: 'admin' } }); assert.equal(rk.j.ok, 1);
  const rec = await C2.api('/api/recover', { method: 'POST', body: { key: rk.j.key || rk.j.rk, pw: '482917' } }); assert.equal(rec.j.ok, 1, 'الاستعادةُ برقمٍ من 6 أرقام تنجح: ' + JSON.stringify(rec.j).slice(0, 120));
  const li = await C2.login('admin', '482917'); assert.equal(li.ok, true, 'الدخولُ بالرقم الجديد');   /* (mustChange هنا لاسم المستخدم «admin» غيرِ ذي العشرة أرقام — unCheck — لا للرقم) */
});
