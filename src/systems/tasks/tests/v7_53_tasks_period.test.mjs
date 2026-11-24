/* V7 · 53 (قرار المالك ٧ — «قاعدةُ الفترة المقفلة نفسُها كبقية الأنظمة» · ٨ — الرسالةُ بحسب القارئ): كلُّ كتابةٍ على مهمة تتبع قاعدةَ الصفحة —
   الشهرُ الماضي مقفلٌ ما لم يُفتح للاستدراك ({mo:1}) · واليومُ المنقضي من الشهر الجاري مقفلٌ ما لم يُفتح هو أو شهرُه · والمُغلقُ بيده مقفل.
   حالةٌ لكل نوع مسار: كتابةُ الموظف (/api/me/tasks/act) · مساراتُ المسؤول (المراجعة · التمديد · إعادة الإسناد · الإلغاء) · الحفظُ الخامّ للمخزن (/api/save).
   العاملُ الحقيقي · الإنفاذ · ساعةٌ مثبَّتة (1448-5-9 · 10:00 الرياض) · TEST_ONLY. */
import '../../../../tests/unit/clock.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, MATE, KT, D, DAY, PDAY, YESTERDAY, stored, ymOf, row, HR, taskCommandBody, replaceOperationalFixture, operationSaveBody } from './tasks_fx.mjs';

const WU = workerUnderTest(), DM = ['0000000101', '70101'], KL = 'bsdept:' + D + ':bassam_tasks_locks_v1';
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
const show = (r) => JSON.stringify(r.j || r).slice(0, 300);
const MGR_M = 'الشهر مقفل — افتحه للاستدراك أولاً', EMP_M = 'الشهر مقفل — راجع مدير الإدارة', EMP_D = 'اليوم مقفل — راجع مدير الإدارة', MGR_D = 'اليوم مقفل — افتحه للاستدراك أولاً';
const isLocked = (r, msg) => r.status === 409 && r.j && r.j.err === 'locked' && r.j.msg === msg;

test('كتابةُ الموظف: مهمةٌ في شهرٍ ماضٍ غيرِ معتمد ⇒ 409 «الشهر مقفل — راجع مدير الإدارة» · وبعد فتح الشهر يُحكم بالحالة · ويومُ أمس (الشهرُ الجاري) على قفل الشهر وحده كالصفحة', async () => {
  const W = await world({ worker: WU.file, mode: 'enforce' }), me = await W.login(ME.un, ME.pw);
  await replaceOperationalFixture(W.env, KL, {});
  const r = await post(W, me.ck, '/api/me/tasks/act', { k: PDAY, id: 1760000000108, act: 'accept' });
  assert.ok(isLocked(r, EMP_M), show(r));
  await replaceOperationalFixture(W.env, KL, { [ymOf(PDAY)]: { mo: 1 } });
  const r2 = await post(W, me.ck, '/api/me/tasks/act', { k: PDAY, id: 1760000000108, act: 'accept' });
  assert.notEqual(r2.j && r2.j.err, 'locked', 'opened ⇒ judged by the task state: ' + show(r2));
  assert.equal(ymOf(YESTERDAY), ymOf(DAY), 'الساعةُ المثبَّتة: أمسُ من الشهر الجاري');
  const r3 = await post(W, me.ck, '/api/me/tasks/act', { k: YESTERDAY, id: 1760000000105, act: 'ack' });
  assert.notEqual(r3.j && r3.j.err, 'locked', 'workflow on a past day of the current month: month lock only (page _tkP2Menu): ' + show(r3));
});

test('مساراتُ المسؤول (المراجعة · التمديد · إعادة الإسناد · الإلغاء): شهرٌ ماضٍ غيرُ معتمد ⇒ 409 «الشهر مقفل — افتحه للاستدراك أولاً» ولا كتابة · وبعد الفتح لا قفل · والإنشاءُ في يومٍ منقضٍ ⇒ «اليوم مقفل…»', async () => {
  const W = await world({ worker: WU.file, mode: 'enforce' }), dm = await W.login(...DM);
  const calls = (k, id) => [
    ['/api/tasks/review', { k, id, ekey: ME.eid, decision: 'approve' }],
    ['/api/tasks/extend', { k, id, ekey: ME.eid, e: Date.now() + HR }],
    ['/api/tasks/reassign', { k, id, from: ME.eid, to: MATE.eid }],
    ['/api/tasks/cancel', { k, id, ekey: ME.eid, why: 'TEST_ONLY' }],
  ];
  await replaceOperationalFixture(W.env, KL, {});
  const before = JSON.stringify(stored(W.env, KT));
  for (const [p, b] of calls(PDAY, 1760000000108)) { const r = await post(W, dm.ck, p, b); assert.ok(isLocked(r, MGR_M), p + ' (past month): ' + show(r)); }
  assert.equal(JSON.stringify(stored(W.env, KT)), before, 'nothing written');
  await replaceOperationalFixture(W.env, KL, { [ymOf(PDAY)]: { mo: 1 } });
  for (const [p, b] of calls(PDAY, 1760000000108)) { const r = await post(W, dm.ck, p, b); assert.notEqual(r.j && r.j.err, 'locked', p + ' after opening: ' + show(r)); }
  /* الإنشاءُ في يومٍ منقضٍ من الشهر الجاري (tasksCanAdd في الصفحة) */
  const s0 = Date.now() - 24 * HR;
  const c = await post(W, dm.ck, '/api/tasks/create', { k: YESTERDAY, t: 'TEST_ONLY أمس', s: s0, e: s0 + HR, asg: [ME.eid], rv: 'none', force: true });
  assert.ok(isLocked(c, MGR_D), show(c));
  await replaceOperationalFixture(W.env, KL, { [YESTERDAY]: { mo: 1 } });
  const c2 = await post(W, dm.ck, '/api/tasks/create', { k: YESTERDAY, t: 'TEST_ONLY أمس', s: s0, e: s0 + HR, asg: [ME.eid], rv: 'none', force: true });
  assert.notEqual(c2.j && c2.j.err, 'locked', show(c2));
});

test('الحفظُ الخامّ للمخزن (/api/save): إضافةُ مهمةٍ في يومٍ منقضٍ من الشهر الجاري ⇒ 403 بقفل اليوم برسالة القارئ · وبعد فتح اليوم يُقبل', async () => {
  const W = await world({ worker: WU.file, mode: 'enforce' }), dm = await W.login(...DM);
  await replaceOperationalFixture(W.env, KL, {});
  const add = async (id) => { const g = await get(W, dm.ck, '/api/operations/read?keys=' + encodeURIComponent(KT)); const S = g.j.resources[KT]; S[YESTERDAY] = (S[YESTERDAY] || []).concat([row({ id, title: 'أمس من الحفظ الخامّ', eid: ME.eid, s: Date.now() - 20 * HR, e: Date.now() - 19 * HR })]);
    return W.C.api('/api/save', { method: 'POST', cookie: dm.ck, body: operationSaveBody(W.env, '/api/save', { set: { [KT]: JSON.stringify(S) }, del: [], base: { [KT]: g.j.base[KT] } }) }); };
  const r = await add(1760000053105);
  assert.equal(r.status, 403, show(r));
  assert.match(String(r.j.denied[KT].detail || ''), /locked-period: day-past/, show(r));
  assert.ok(!stored(W.env, KT)[YESTERDAY].some((q) => q[13] === 1760000053105), 'not added');
  await replaceOperationalFixture(W.env, KL, { [YESTERDAY]: { mo: 1 } });
  const r2 = await add(1760000053106);
  assert.equal(r2.status, 200, show(r2));
});
