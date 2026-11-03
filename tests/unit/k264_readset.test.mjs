/* KIVO_264 · D-4 (متوسط) — التبويبُ المفتوح لا يعيد مزامنةَ بياناته حين تتغيّر مجموعةُ قراءة المستخدم (دليلُ التدقيق t4 مُكيَّفاً).
   العيب: /api/changes لا يبلّغ إلا عمّا تغيّرت مراجعتُه؛ المنحُ يغيّر bassam_perms_v1 (وفي الإنفاذ az ⇒ /api/authz) لكنّ البيانات الممنوحة
   لم تتغيّر مراجعتُها فلا تُجلب (صفحةٌ فارغة حتى التحديث اليدوي)، والمسحوبةُ لا تُخرج من الذاكرة (تبقى معروضة). وفي الإنفاذ: تغيّرُ نطاق
   الموظف (المواقع) لا يجدّد البيانات المُسقَطة به. المطلوب: تجديدُ ما يقرؤه المستخدم الآن بلا إعادة تحميل، وما سُحب يختفي. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, applySql, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { loadClient, until, sleep, fixture } from './k264_vm.mjs';
import {installCurrentSchemaFixture} from './current_schema_fx.mjs';
import {mountIrshadPage} from './irshad_live_page_fx.mjs';

const KT = 'bsdept:tst_d1:bassam_tasks_v1', KI = 'bsdept:tst_d1:bassam_irshad_v1';
async function setup(mode) {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : { KIVO_TEST_FIXTURE: 'allow' }); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, fixture().seed);
  await installCurrentSchemaFixture(env);
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
  /* schema 10: tasks is a typed Operations resource — the tab holds it only through KIVO.__BS_SRV.operations (never the generic
     KV memory). The grant must reach the open tab through the tab's OWN refresh path: the permission change arrives on the tab's
     /api/changes poll, readSet9 re-reads every Operations key the tab already knows (280-server-storage.js rsRun9 → operationRead9),
     and the tab's own state for KT becomes 'ready' holding exactly what the server now serves this user — with no read issued by
     this test after the grant. The revoked typed Irshad page loses its rows. */
  const OPS = A.W.KIVO.__BS_SRV.operations, rows = (v) => Object.values(v || {}).flat().filter(r => Array.isArray(r) && /TEST_ONLY/.test(String(r[0]))).length;
  try {
    await sleep(1500);
    assert.ok(ir.page.state.irRecords?.total>0,'The actual module read the typed rows before revocation');
    /* The one pre-grant read stands in for the tasks page's mount read (this VM loads only the storage block, and rsRun9 refreshes only
       keys a consumer has already asked for). It establishes the tab's 'denied' baseline; nothing after the grant is read by the test. */
    const r0 = await OPS.read([KT]);
    assert.equal(r0.ok, 1); assert.equal(JSON.stringify(r0.denied), JSON.stringify([KT]), 'البداية: المهامُ مرفوضةٌ للتبويب ' + JSON.stringify(r0).slice(0, 300)); assert.equal(OPS.state('bassam_tasks_v1'), 'denied');
    P = await getK('bassam_perms_v1'); P.emps.tst_d1.tst_e_emp1.tasks = ['view']; delete P.emps.tst_d1.tst_e_emp1['irshad/records'];
    const tabReads0 = A.log.filter(x => x === 'GET /api/operations/read').length;   /* baseline before the grant: a poll during the save cannot hide the tab's own re-read */
    assert.ok((await C.save(su.ck, { bassam_perms_v1: JSON.stringify(P) })).j.revs, 'منحٌ وسحب');
    /* The tab's own state only — OPS.state/OPS.get never fetch; no OPS.read here */
    const tabReady = () => OPS.state('bassam_tasks_v1') === 'ready';
    const ok = await until(() => tabReady() && ir.page.state.irRecords == null && !!ir.page.state.irCloudError, 6000);
    const st = { tabTasks: OPS.state('bassam_tasks_v1'), tabHasIrshad: ir.page.state.irRecords != null };
    assert.ok(ok, 'الممنوحُ وصل والمسحوبُ أُزيل بلا إعادة تحميل: ' + JSON.stringify(st));
    assert.ok(A.log.filter(x => x === 'GET /api/operations/read').length > tabReads0, 'The tab itself re-read the granted Operations resource after the grant');
    /* Server truth for this user, fetched outside the tab (never through OPS, so the tab state is untouched): the tab holds exactly it */
    const srv = await C.api('/api/operations/read?' + new URLSearchParams({ uid: 'tst_emp1', keys: KT }), { cookie: U.ck });
    assert.equal(srv.status, 200); assert.deepEqual(srv.j.denied, [], 'The server now serves the granted tasks to tst_emp1');
    assert.ok(rows(srv.j.resources[KT]) > 0, 'The granted resource carries TEST_ONLY day rows ' + JSON.stringify(srv.j).slice(0, 200));
    assert.deepEqual(JSON.parse(JSON.stringify(OPS.get('bassam_tasks_v1'))), srv.j.resources[KT],   /* JSON round-trip: the tab value lives in the VM realm */
      'The tab\'s own Operations state holds the granted rows');
    /* The granted data reaching the module is proven above on the Operations path (the tab's own refresh turned KT from 'denied'
       into 'ready' with the served rows, no test read after the grant); the permission change itself arrives as a remote change. */
    assert.ok(remote.includes('bassam_perms_v1'), 'The permission invalidation reaches the actual module ' + JSON.stringify(remote));
    assert.ok(!remote.includes(KI), 'No retired Irshad JSON key is announced');
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

/* Retired requirement (removed test '[enforce] D-4: توسيعُ نطاق الوردية لموظفٍ يجدّد بياناتِه المُسقَطة بالنطاق'):
   it widened the Shift scope of the legacy scope ceiling bsdept:tst_d1:bassam_scope_v1 and expected more Irshad rows.
   That ceiling is retired — commit 74554f6 (retire the legacy scope ceiling (bassam_scope_v1)), workers/parts/061-enf-read.js:3
   (Shift D4-09 / Site / Zone projection no longer restricts reads) and docs/architecture.md:114 (bassam_scope_v1 is neither read
   by enforcement nor written: 'scope-retired'). The server now refuses the write with why 'scope-retired', so the scenario has no
   current equivalent; unit-ceiling read changes are covered by the grant/revoke test above. */
