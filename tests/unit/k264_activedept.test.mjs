/* KIVO_264 · D-7 (عالٍ · مدير النظام/مدير الفرع بعدّة تبويبات) — تبديلُ الإدارة في تبويبٍ يحوّل كتاباتِ التبويب الآخر (دليلُ التدقيق t9).
   العيب: «الإدارةُ النشطة» قيمةُ جهازٍ واحدة (bassam_active_dept_v1 في المخزن الأصلي) تتشاركها التبويبات، وكلُّ تبويبٍ بُنيت واجهتُه
   لإدارةٍ بعينها؛ التبديلُ في التبويب ٢ يُطلق حدثَ storage في التبويب ١ فتُعاد قراءةُ القيمة، والتبويبُ ١ — وما زال يعرض الإدارة أ —
   يكتب في مفاتيح الإدارة ب. المطلوب: الإدارةُ لكل تبويب (sessionStorage)، وقيمةُ الجهاز افتراضٌ للتبويب الجديد وحده. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { loadClient, shareNative, asWriter, sleep, FakeStorage } from './k264_vm.mjs';

const BLOCKS = ['280-server-storage.js', '310-image-refs.js', '320-dept-storage.js'];
test('D-7: تبديلُ الإدارة في تبويبٍ لا يحوّل كتاباتِ تبويبٍ آخر · التبويبُ الجديد يبدأ باختيار الجهاز الأخير · إعادةُ التحميل تُبقي إدارةَ التبويب', async () => {
  const env = makeTestEnv({}); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  assert.equal((await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dA', name: 'TEST_ONLY إدارة أ' }, { id: 'dB', name: 'TEST_ONLY إدارة ب' }]) })).j.ok, 1);
  const KA = 'bsdept:dA:bassam_perm_help_v1', KB = 'bsdept:dB:bassam_perm_help_v1';
  assert.equal((await C.save(su.ck, { [KA]: JSON.stringify({ type: ['TEST_ONLY A-orig'] }), [KB]: JSON.stringify({ type: ['TEST_ONLY B-orig'] }) })).j.ok, 1);
  const boot = (await C.boot(su.ck)).boot;
  const jar = { cookie: su.ck };
  const t1 = loadClient({ C, boot, jar, blocks: [] }), t2 = loadClient({ C, boot, jar, blocks: [] });
  const shared = shareNative([t1, t2]);
  shared.set('bassam_active_dept_v1', 'dA');
  t1.run(BLOCKS); t2.run(BLOCKS);
  const tabs = [t1, t2];
  try {
    assert.equal(t1.W.KIVO.BassamDepts.active(), 'dA'); assert.equal(t2.W.KIVO.BassamDepts.active(), 'dA');
    assert.match(t1.get('bassam_perm_help_v1'), /A-orig/, 'التبويب ١ على الإدارة أ');
    /* التبويب ٢: المستخدم يختار الإدارة ب (root-logic pick → D.setActive → إعادةُ تحميل التبويب ٢ وحده) */
    assert.equal(asWriter(shared, t2, () => t2.W.KIVO.BassamDepts.setActive('dB')), true);
    /* التبويب ١: ما زال على شاشة الإدارة أ، والمستخدم يعدّل القائمة التي يراها */
    assert.equal(t1.W.KIVO.BassamDepts.active(), 'dA', 'التبويب ١ لم يُحوَّل إلى الإدارة ب');
    assert.match(t1.get('bassam_perm_help_v1'), /A-orig/, 'والتبويب ١ ما زال يقرأ الإدارة أ');
    t1.set('bassam_perm_help_v1', JSON.stringify({ type: ['TEST_ONLY edited in tab 1 while viewing A'] }));
    t2.set('bassam_perm_help_v1', JSON.stringify({ type: ['TEST_ONLY edited in tab 2 on B'] }));
    await sleep(900);
    const srvA = env.DB.q('SELECT v FROM kv WHERE k = ?', KA)[0].v, srvB = env.DB.q('SELECT v FROM kv WHERE k = ?', KB)[0].v;
    assert.match(srvA, /edited in tab 1 while viewing A/, 'تعديلُ شاشة الإدارة أ وصل الإدارةَ أ على الخادم: ' + srvA);
    assert.match(srvB, /edited in tab 2 on B/, 'وتعديلُ التبويب ٢ في الإدارة ب: ' + srvB);
    /* تبويبٌ جديد على الجهاز نفسِه: يبدأ بآخر اختيارٍ للجهاز */
    const t3 = loadClient({ C, boot, jar, blocks: [] }); tabs.push(t3); shareNative(tabs); t3.run(BLOCKS);
    assert.equal(t3.W.KIVO.BassamDepts.active(), 'dB', 'التبويبُ الجديد على آخر اختيارٍ للجهاز');
    /* إعادةُ تحميل التبويب ١ (مخزنُ جلسته باقٍ كما في المتصفح) تُبقيه على إدارته */
    const t1r = loadClient({ C, boot, jar, blocks: [], session: t1.W.sessionStorage }); tabs.push(t1r); shareNative(tabs); t1r.run(BLOCKS);
    assert.equal(t1r.W.KIVO.BassamDepts.active(), 'dA', 'إعادةُ التحميل تُبقي إدارةَ التبويب');
    /* ونداءٌ مباشرٌ لمخزن الإدارة النشطة (تدفّقاتُ الدخول والاستعادة) يضبط التبويبَ نفسَه مع افتراض الجهاز */
    asWriter(shared, t1r, () => t1r.W.KIVO.__BS_RAWLS.setItem.call(t1r.W.localStorage, 'bassam_active_dept_v1', 'dB'));
    assert.equal(t1r.W.sessionStorage.getItem('bassam_active_dept_v1'), 'dB');
    assert.equal(t2.W.KIVO.BassamDepts.active(), 'dB'); assert.equal(t3.W.KIVO.BassamDepts.active(), 'dB');
  } finally { tabs.forEach(t => t.dispose()); }
});

test('D-7: بلا sessionStorage (سياسةٌ تمنعه) يبقى السلوكُ على قيمة الجهاز كما كان — لا عطل', () => {
  const C = { req: async () => new Response(JSON.stringify({ v: 1, keys: [] }), { status: 200 }) };
  const ss = new FakeStorage(); ss.getItem = () => { throw new Error('SecurityError'); }; ss.setItem = () => { throw new Error('SecurityError'); };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, v: 1, uid: 'su', keys: { bassam_depts_v1: JSON.stringify([{ id: 'dA', name: 'أ' }, { id: 'dB', name: 'ب' }]) }, revs: {} }, blocks: [], session: ss });
  try {
    T.W.localStorage.setItem('bassam_active_dept_v1', 'dB');
    T.run(BLOCKS);
    assert.equal(T.W.KIVO.BassamDepts.active(), 'dB');
    assert.equal(T.W.KIVO.BassamDepts.setActive('dA'), true);
    assert.equal(T.W.KIVO.BassamDepts.active(), 'dA');
  } finally { T.dispose(); }
});
