/* RISHAD 266 — Cloud-only regression tests: without an authenticated cloud bootstrap,
   the UI must not initialize local departments, users, sessions or business storage,
   even under file:// or localhost. Explicitly seeded test users exist only in D1. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { loadClient, sleep, pageText, FakeStorage } from './k264_vm.mjs';

const BLOCKS = ['280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js'];
const net0 = { req: async () => { throw new Error('no network expected'); } };

test('D-2: أصلٌ سحابيّ بلا __BS_BOOT ⇒ لا قاعدةَ محلية ولا admin/admin ولا دخولَ محليّ — وحالة فشل مغلق واضحة', async () => {
  const T = loadClient({ C: net0, boot: null, href: 'https://kivo.example.sa/', blocks: BLOCKS });
  try {
    const K = T.W.KIVO;
    const ls0 = T.nativeLS();
    assert.equal(K.__BS_SRV, undefined, 'لا طبقةَ مزامنة (لا خادم)');
    assert.deepEqual(Object.keys(ls0), [], 'مخزنُ الجهاز لم يُمسّ (لا سجلَّ إدارات ولا حساباتٍ ولا هيكل): ' + Object.keys(ls0).join(', '));
    assert.notEqual(typeof (K.__BS_I && K.__BS_I.auth && K.__BS_I.auth.login), 'function', 'بدون الخادم لا يُتاح أي مسار دخول');
    await sleep(150);
    assert.deepEqual(Object.keys(T.nativeLS()), [], 'التطبيق لا يُنشئ بيانات عمل على الجهاز عند غياب الخادم');
    assert.equal(T.saves().length, 0, 'ولا شيءَ يُرسل');
    assert.match(pageText(T.W), /تعذّر تشغيل النظام/, 'حالةٌ حاجبةٌ صريحة بالعربية');
    assert.equal(K.__BS_STORAGE_FAIL, 'cloud-boot-required', 'غياب الإقلاع يغلق المنصة');
    assert.equal(K.__BS_NOSRV, 1);
  } finally { T.dispose(); }
});

test('D-2(C): علامةُ جلسة مدير النظام الباقية على الجهاز لا تفتح تطبيقاً محلياً على الأصل السحابي', () => {
  const native = new FakeStorage(); const now = Date.now();
  native.setItem('bassam_session_v1', JSON.stringify({ uid: 'su', ts: now, la: now, mc: 0 }));
  native.setItem('bassam_active_dept_v1', 'dR');
  const T = loadClient({ C: net0, boot: null, href: 'https://kivo.example.sa/', native, blocks: BLOCKS });
  try {
    assert.notEqual(typeof (T.W.KIVO.__BS_I && T.W.KIVO.__BS_I.auth && T.W.KIVO.__BS_I.auth.cur), 'function', 'لا جلسات تشغيل محلية');
    assert.deepEqual(Object.keys(T.nativeLS()).sort(), ['bassam_active_dept_v1', 'bassam_session_v1'], 'مخزنُ الجهاز كما كان — لا زرعَ ولا مسح');
  } finally { T.dispose(); }
});

for (const href of ['file:///opt/kivo/index.html', 'http://localhost:8787/']) test('RISHAD 266: لا تسجيل دخول محلي على ' + href, async () => {
  const T = loadClient({ C: net0, boot: null, href, blocks: BLOCKS });
  try {
    const K = T.W.KIVO;
    const ls = T.nativeLS();
    assert.equal(K.__BS_NOSRV, 1, 'غياب الإقلاع السحابي يمنع التشغيل في كل أصل');
    assert.ok(!ls.bassam_auth_users_v1, 'لا إنشاء حسابات داخل الجهاز');
    assert.notEqual(typeof (K.__BS_I && K.__BS_I.auth && K.__BS_I.auth.login), 'function', 'لا واجهة تسجيل دخول محلية');
    assert.equal(T.saves().length, 0, 'لا حفظ تشغيلي بدون خادم');
  } finally { T.dispose(); }
});

test('D-2: الأصلُ السحابيّ مع __BS_BOOT ⇒ لا حالةَ حاجبة (ضابط)', async () => {
  const env = makeTestEnv({}); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  const boot = (await C.boot(su.ck)).boot; assert.ok(boot && boot.srv);
  const T = loadClient({ C, boot, jar: { cookie: su.ck }, href: 'https://kivo.example.sa/', blocks: BLOCKS });
  try {
    assert.equal(T.W.KIVO.__BS_NOSRV, undefined);
    assert.ok(T.W.KIVO.__BS_SRV && typeof T.W.KIVO.__BS_SRV.flushAsync === 'function', 'طبقةُ المزامنة تعمل');
    assert.doesNotMatch(pageText(T.W), /تعذّر الاتصال بالخادم/);
  } finally { T.dispose(); }
});
