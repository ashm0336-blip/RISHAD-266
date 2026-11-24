/* V7 · 53 (writers · بقايا 52): العميلُ الحقيقي (331) فوق العامل الحقيقي في وضع الإنفاذ — TEST_ONLY:
   ① الجرد ٥: لا كتابةَ عند القراءة — سجلٌّ بلا lensZ وعدساتُ وحدةٍ بلا «المناطق» وورقةٌ بالمفتاح القديم emps/tasks: مديرُ الإدارة والموظفُ
      يفتحان ويقرآن ⇒ لا حفظَ ولا رفض، والسجلُّ المخزَّن بايتاً كما كان؛ والقراءةُ هي قراءةُ الخادم (المصفوفةُ كما خُزِّنت)، والورقةُ تُقرأ tasks
   ② p24SetGrant يحمل until وكلَّ حقلٍ آخر في المدخل المخزَّن
   ③ setDeptLenses يحمل مفتاحَ العدسة الذي لا يعرفه هذا البناء */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, stored, putKV } from './world_fx.mjs';
import { loadClient, until, sleep } from './k264_vm.mjs';

const D = 'tst_d1', KP = 'bassam_perms_v1', GK = 'bsdept:' + D + ':bassam_grants_v1', EK = 'tst_e_emp1';
const BLOCKS = ['255-page-manifest.js', '260-bassam-plat.js', '280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js', '331-perm-model.js', '332-find-day.js', '333-platform-map.js', '334-perm-tree-tpl.js', '340-registry-v24-9.js', '440-count.js'];
async function clientOf(W, who) {
  const boot = (await W.C.boot(W.ck[who])).boot;
  const T = loadClient({ C: W.C, boot, jar: { cookie: W.ck[who] }, blocks: [] });
  T.W.atob = globalThis.atob; T.W.btoa = globalThis.btoa;
  T.W.localStorage._m.set('bassam_session_v1', JSON.stringify({ uid: boot.uid, ts: Date.now(), la: Date.now() }));
  T.W.localStorage._m.set('bassam_active_dept_v1', D);
  T.W.document.hidden = true;
  T.run(BLOCKS);
  if (!T.W.KIVO.KIVO_REGISTRY && T.W.KIVO_REGISTRY) T.W.KIVO.KIVO_REGISTRY = T.W.KIVO_REGISTRY;
  const K = T.W.KIVO, SV = K.__BS_SRV, I = K.__BS_I.auth;
  assert.ok(I && !I.dead && SV, 'client loaded');
  const settle = async () => { await sleep(30); assert.ok(await until(() => !SV.dirty() && !SV.inflight(), 8000), 'settled'); await sleep(30); };
  return { T, K, I, P: K.BassamPerm, SV, settle, dispose: () => T.dispose() };
}
const raw = (W) => W.env.DB.q('SELECT v FROM kv WHERE k = ?1', KP)[0].v;

test('① no write on read: a record without lensZ, a unit lens list without zones and an emps/tasks sheet — manager and employee open it, nothing is saved', async () => {
  const W = await world({ mode: 'enforce' });
  W.ck = { dm1: (await W.login('0000000101', '70101')).ck, emp: (await W.login('0000000113', '70113')).ck };
  const P = stored(W.env, KP);
  delete P.lensZ;
  P.lenses = Object.assign({}, P.lenses || {}, { [D]: ['paths', 'dens'] });   /* «المناطق» غيرُ مذكورة */
  P.emps[D].tst_e_legacy = { 'emps/tasks': ['view'] };                         /* مفتاحُ الورقة القديم */
  putKV(W.env, KP, P);
  const before = raw(W);
  for (const who of ['dm1', 'emp']) {
    const c = await clientOf(W, who);
    try {
      await c.settle();
      const st = c.I.permStore();
      assert.equal(st.lensZ, undefined, who + ': lensZ is carried as stored (absent)');
      assert.equal(c.I.deptLenses(D).indexOf('zones'), -1, who + ': the unit lens list is read as stored — the server reads it so (057 enfLensDeptOn)');
      if (who === 'dm1') {   /* الموظفُ لا يرى أوراقَ غيره (إسقاطُ الخصوصية في الخادم) */
        assert.equal(JSON.stringify(c.I.empPerms('tst_e_legacy', D).tasks), '["view"]', who + ': the legacy emps/tasks sheet is read as tasks');
        assert.ok(st.emps[D].tst_e_legacy['emps/tasks'], who + ': the stored record keeps its key (no rename in the store)');
      }
      await c.settle();
      assert.equal(c.SV.denied(), 0, who + ': no refused write');
    } finally { c.dispose(); }
    assert.equal(raw(W), before, who + ': the stored record is byte-identical after opening');
  }
});

test('② p24SetGrant carries the stored until and an unknown entry field', async () => {
  const W = await world({ mode: 'enforce' });
  W.ck = { su: W.su.ck };
  const until0 = { 'task.view': Date.now() + 86400000 };
  putKV(W.env, GK, { v: 1, emp: { [EK]: { plus: ['task.view'], minus: [], src: 'p44:ex', at: 1, by: 'su', until: until0 } } });
  const c = await clientOf(W, 'su');
  try {
    await c.settle();
    const r = c.P.p24.setGrant(EK, D, { plus: ['task.view'], minus: ['task.create'] });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(JSON.stringify(JSON.parse(c.T.W.localStorage.getItem(GK)).emp[EK].until), JSON.stringify(until0), 'until is carried locally');
    const g = JSON.parse(c.T.W.localStorage.getItem(GK)).emp[EK];
    assert.equal(JSON.stringify(g.minus), '["task.create"]', 'the user\'s change is written');
    /* ما يقبله الخادمُ بعد ذلك يحكمه سجلُّ الأدوار (p44-grants · 060) — هذا الاختبارُ للكاتب في العميل */
  } finally { c.dispose(); }
  /* حقلٌ لا يعرفه هذا البناء في المدخل المخزَّن: يُحمل محلياً كما هو */
  putKV(W.env, GK, { v: 1, emp: { [EK]: { plus: ['task.view'], minus: [], at: 1, by: 'su', TEST_ONLY_future: { a: 1 } } } });
  const c2 = await clientOf(W, 'su');
  try {
    await c2.settle();
    assert.equal(c2.P.p24.setGrant(EK, D, { plus: ['task.view'], minus: ['task.create'] }).ok, true);
    assert.equal(JSON.stringify(JSON.parse(c2.T.W.localStorage.getItem(GK)).emp[EK].TEST_ONLY_future), '{"a":1}', 'the unknown entry field is carried');
  } finally { c2.dispose(); }
});

test('③ setDeptLenses carries a lens key this build does not know', async () => {
  const W = await world({ mode: 'enforce' });
  W.ck = { su: W.su.ck };
  const P = stored(W.env, KP); P.lenses = Object.assign({}, P.lenses || {}, { [D]: ['zones', 'TEST_ONLY_lens'] }); putKV(W.env, KP, P);
  const c = await clientOf(W, 'su');
  try {
    await c.settle();
    assert.equal(c.I.setDeptLenses(D, ['zones', 'paths']).ok, true);
    await c.settle(); assert.equal(c.SV.denied(), 0, 'saved');
  } finally { c.dispose(); }
  assert.deepEqual(stored(W.env, KP).lenses[D], ['zones', 'paths', 'TEST_ONLY_lens'], 'the user\'s change and the unknown lens key carried');
});
