/* KIVO_264 · D-4 (متوسط) — التبويبُ المفتوح لا يعيد مزامنةَ بياناته حين تتغيّر مجموعةُ قراءة المستخدم (دليلُ التدقيق t4 مُكيَّفاً).
   العيب: /api/changes لا يبلّغ إلا عمّا تغيّرت مراجعتُه؛ المنحُ يغيّر bassam_perms_v1 (وفي الإنفاذ az ⇒ /api/authz) لكنّ البيانات الممنوحة
   لم تتغيّر مراجعتُها فلا تُجلب (صفحةٌ فارغة حتى التحديث اليدوي)، والمسحوبةُ لا تُخرج من الذاكرة (تبقى معروضة). وفي الإنفاذ: تغيّرُ نطاق
   الموظف (المواقع) لا يجدّد البيانات المُسقَطة به. المطلوب: تجديدُ ما يقرؤه المستخدم الآن بلا إعادة تحميل، وما سُحب يختفي. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, applySql, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { loadClient, until, sleep, fixture } from './k264_vm.mjs';
import {installIrshadFixture} from './irshad_legacy_seed_fx.mjs';
import {mountIrshadPage} from './irshad_live_page_fx.mjs';

const KT = 'bsdept:tst_d1:bassam_tasks_v1', KI = 'bsdept:tst_d1:bassam_irshad_v1', KS = 'bsdept:tst_d1:bassam_scope_v1';
async function setup(mode) {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : { KIVO_TEST_FIXTURE: 'allow' }); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, fixture().seed);
  await installIrshadFixture(env);
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const getK = async (k) => JSON.parse((await C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: su.ck })).j.keys[k].v);
  return { env, C, su, getK };
}

for (const mode of ['legacy', 'enforce']) test('[' + mode + '] D-4: منحُ صفحةٍ وسحبُ أخرى يُطبَّقان على بيانات التبويب المفتوح بلا إعادة تحميل', async () => {
  const { C, su, getK } = await setup(mode);
  const U = await C.login('0000000113', '70113'); assert.ok(U.ok, 'tst_emp1');
  let P = await getK('bassam_perms_v1'); delete P.emps.tst_d1.tst_e_emp1.tasks;
  assert.ok((await C.save(su.ck, { bassam_perms_v1: JSON.stringify(P) })).j.revs, 'البداية: بلا عرض المهام');
  const b = await C.boot(U.ck); assert.ok(!(KT in b.boot.keys)); assert.ok(!(KI in b.boot.keys),'Typed data is not injected as legacy JSON');
  const A = loadClient({ C, boot: b.boot, jar: { cookie: U.ck } });
  const ir=mountIrshadPage(A,'tst_emp1');
  const remote = []; A.W.addEventListener('bassam:remote', (e) => { try { remote.push(...(e.detail.keys || [])); } catch (x) {} });
  try {
    await sleep(1500);
    assert.ok(ir.page.state.irRecords?.total>0,'The actual module read the typed rows before revocation');
    P = await getK('bassam_perms_v1'); P.emps.tst_d1.tst_e_emp1.tasks = ['view']; delete P.emps.tst_d1.tst_e_emp1['irshad/records'];
    assert.ok((await C.save(su.ck, { bassam_perms_v1: JSON.stringify(P) })).j.revs, 'منحٌ وسحب');
    const ok = await until(() => A.get(KT) != null && ir.page.state.irRecords == null && !!ir.page.state.irCloudError, 6000);
    const st = { tabHasTasks: A.get(KT) != null, tabHasIrshad: ir.page.state.irRecords != null };
    assert.ok(ok, 'الممنوحُ وصل والمسحوبُ أُزيل بلا إعادة تحميل: ' + JSON.stringify(st));
    assert.ok(remote.includes(KT) && remote.includes('bassam_perms_v1'), 'The granted KV data and permission invalidation both reach the actual module');
    assert.equal(A.get(KI),null,'The actual module never restores the retired JSON cache');
    assert.ok(!A.log.includes('reload'), 'بلا إعادة تحميل');
  } finally { ir.dispose(); A.dispose(); }
});

test('[legacy] D-4: تغييرُ صلاحيات موظفٍ آخر لا يمسّ بياناتِ هذا التبويب', async () => {
  const { C, su, getK } = await setup('legacy');
  const U = await C.login('0000000113', '70113'); assert.ok(U.ok);
  const b = await C.boot(U.ck); const before = Object.keys(b.boot.keys).sort();
  const A = loadClient({ C, boot: b.boot, jar: { cookie: U.ck } });
  try {
    await sleep(1500);
    const P = await getK('bassam_perms_v1'); P.emps.tst_d1.tst_e_supB = Object.assign({}, P.emps.tst_d1.tst_e_supB || {}, { tasks: ['view'] });
    assert.ok((await C.save(su.ck, { bassam_perms_v1: JSON.stringify(P) })).j.revs);
    await sleep(2600);
    const now = before.filter(k => A.get(k) != null);
    assert.deepEqual(now, before, 'كلُّ ما كان مقروءاً باقٍ');
  } finally { A.dispose(); }
});

test('[enforce] D-4: توسيعُ نطاق الوردية لموظفٍ يجدّد بياناتِه المُسقَطة بالنطاق (الاسترشاد) بلا إعادة تحميل', async () => {
  const { C, su, getK } = await setup('enforce');
  const U = await C.login('0000000112', '70112'); assert.ok(U.ok, 'tst_supB · مشرفُ الوردية ب (نطاقُه وردية الجدول)');
  const b = await C.boot(U.ck); assert.ok(!(KI in b.boot.keys), 'No old Irshad JSON');
  const A = loadClient({ C, boot: b.boot, jar: { cookie: U.ck } });
  const ir=mountIrshadPage(A,'tst_supB');
  try {
    await sleep(1500);
    const n0=ir.page.state.irRecords?.total;assert.ok(n0>0,'Actual module initial typed rows');
    const S = await getK(KS); S.emp.tst_e_supB.Shift = { mode: 'list', list: ['TST-A', 'TST-B'] };
    const w = await C.save(su.ck, { [KS]: JSON.stringify(S) }); assert.ok(w.j.revs && w.j.revs[KS], 'مديرُ النظام وسّع النطاق: ' + JSON.stringify(w.j.denied || {}));
    const query=new URLSearchParams({dept:'tst_d1',view:'records',year:String(ir.page.state.irYear),month:String(ir.page.state.irMonth),limit:'200'});
    const srv = await C.api('/api/irshad?'+query, { cookie: U.ck });assert.equal(srv.status,200);
    const n1 = srv.j.total;
    assert.ok(n1 > n0, 'الخادمُ يُسقط له الآن أكثر: ' + n0 + ' → ' + n1);
    assert.ok(await until(() => ir.page.state.irRecords?.total === n1, 6000), 'التبويبُ صار يرى ما يراه الخادمُ له الآن: ' + JSON.stringify({ n0, n1, tab: ir.page.state.irRecords?.total }));
    assert.equal(A.get(KI),null,'No legacy JSON cache');
    assert.ok(!A.log.includes('reload'));
  } finally { ir.dispose(); A.dispose(); }
});
