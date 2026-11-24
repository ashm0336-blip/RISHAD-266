/* V7 · 53 (FIX_53_LIVEQA ١ — «لا يصل شيء لمن لا يخصّه»؛ السيلُ صنفٌ واحد): تعديلُ بيانات 500 موظف في حفظٍ واحد.
   كان الخادم (019 nfEmployeeEvents) يُصدر emp_edit لكل سجل موجَّهاً لصاحبه وللمدير معاً — فيصل المديرَ 500 تنبيه.
   الآن: كلُّ موظفٍ تنبيهُه هو وحده، والمديرُ تنبيهٌ مجمّعٌ واحد (emp_edit «بالجملة»)، والفاعلُ لا شيء (د7 (ج) ٨). أقلُّ من خمسة: كما كان.
   العاملُ الحقيقي · /api/save · /api/notifications · بيانات TEST_ONLY (tests/fixtures/gen_fixture.py + world_fx). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, stored, D, KE } from './world_fx.mjs';
import { TEST_SUPER_USERNAME } from './harness.mjs';

const ACC = [['tst_dm1', '0000000101', '70101'], ['tst_gm1', '0000000103', '70103'], ['tst_emp1', '0000000113', '70113']];
const DM1 = 'TEST_ONLY · مدير الإدارة ١';
let seq = 0;
async function mk() {
  const w = await world({ mode: 'enforce' }), env = w.env;
  const superId = stored(env, 'bassam_auth_users_v1').find((u) => u.role === 'super' && u.un === TEST_SUPER_USERNAME).id, cks = { super: w.su.ck }, ids = { super: superId };
  const ck = async (who) => { if (!cks[who]) { const a = ACC.find((x) => x[0] === who); cks[who] = (await w.login(a[1], a[2])).ck; ids[who] = who; } return cks[who]; };
  const api = async (who, p, o = {}) => w.C.api(p, Object.assign({}, o, { cookie: await ck(who) }));
  const save = async (who, mutate) => {
    await ck(who); const g = (await api(who, '/api/operations/read?' + new URLSearchParams({ uid: ids[who], keys: KE }))).j, value = mutate(JSON.parse(JSON.stringify(g.resources[KE])));
    const body = { uid: ids[who], requestId: 'TEST_ONLY_53e_' + (++seq), epoch: g.epoch, set: { [KE]: JSON.stringify(value) }, del: [], base: { [KE]: g.base[KE] }, why: { [KE]: 'TEST_ONLY تعديل' } };
    const r = await api(who, '/api/save', { method: 'POST', body }); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300)); assert.equal(r.j.ok, 1);
  };
  const feed = async (who) => { await ck(who); const r = await api(who, '/api/notifications?' + new URLSearchParams(who === 'super' ? { uid: ids.super, all: '1' } : { uid: ids[who] || who, limit: '200' })); assert.equal(r.status, 200, who + ' feed'); return r.j.items.filter((m) => /^emp_(edit|type)$/.test(m.type)); };
  const msgs = (n0) => env.DB.q("SELECT scope,id,type,body FROM notification_messages WHERE type IN ('emp_edit','emp_type') ORDER BY created_at,id").slice(n0);
  const targets = () => env.DB.q('SELECT message_id,kind,value FROM notification_targets');
  return { env, save, feed, msgs, targets };
}
const NEW = (n) => ({ eid: 'tst_e_b' + n, name: 'TEST_ONLY · موظف ' + n, empno: String(91000 + n), type: 'TEST_ONLY رسمي', work: 'TEST_ONLY مراقب' });

test('53 · ١ (employees): bulk edit of 500 in one save → the manager ONE grouped notice; each employee exactly one (his own); the actor nothing', { timeout: 600000 }, async () => {
  const x = await mk();
  await x.save('tst_dm1', (v) => v.concat(Array.from({ length: 500 }, (_, i) => NEW(i))));
  const n0 = x.msgs(0).length;
  const eks = Array.from({ length: 500 }, (_, i) => 'tst_e_b' + i).concat(['tst_e_emp1']);
  await x.save('tst_dm1', (v) => v.map((e) => (eks.includes(e.eid) ? Object.assign({}, e, { work: 'TEST_ONLY حارس' }) : e)));
  const sent = x.msgs(n0);
  assert.ok(sent.length <= 3, 'a handful of messages (the unit keeps 400), not one per record: ' + sent.length);
  /* المديرُ (المدير العام قارئٌ من مستلمي «المدير»؛ مديرُ الإدارة هنا هو الفاعل) */
  const gm = await x.feed('tst_gm1');
  assert.equal(gm.length, 1, 'one notice to the manager, not one per employee: ' + gm.length);
  assert.equal(gm[0].type, 'emp_edit'); assert.equal(gm[0].t, 'تعديل بيانات موظفين بالجملة');
  assert.equal(gm[0].b, 'عُدّلت بيانات موظفين بالجملة (501): نوع العمل — بواسطة ' + DM1);
  /* كلُّ موظف: تنبيهٌ واحد هو تنبيهُه، بلا هدف دور */
  const ids = new Set(sent.map((m) => m.id)), tg = x.targets().filter((t) => ids.has(t.message_id)), per = {};
  for (const t of tg.filter((t) => t.kind === 'employee')) per[t.value] = (per[t.value] || 0) + 1;
  for (const ek of eks) assert.equal(per[ek], 1, ek + ' exactly once');
  for (const m of sent.filter((m) => m.type === 'emp_edit' && !/بالجملة/.test(m.body))) assert.deepEqual(tg.filter((t) => t.message_id === m.id && t.kind === 'role'), [], 'an own notice has no role target');
  const own = await x.feed('tst_emp1');
  assert.equal(own.length, 1, JSON.stringify(own.map((m) => m.type + ' ' + m.b)));
  assert.equal(own[0].b, 'عُدّلت بياناتك: نوع العمل — بواسطة ' + DM1);
  /* الفاعل */
  assert.deepEqual((await x.feed('tst_dm1')).map((m) => m.type), [], 'the actor is not notified of his own edit');
  /* أقلُّ من خمسة: كما كان — emp_edit لصاحبه وللمدير */
  const n1 = x.msgs(0).length;
  await x.save('tst_dm1', (v) => v.map((e) => (['tst_e_b0', 'tst_e_b1'].includes(e.eid) ? Object.assign({}, e, { work: 'TEST_ONLY مراقب' }) : e)));
  const few = x.msgs(n1);
  assert.deepEqual(few.map((m) => m.type), ['emp_edit', 'emp_edit']);
  const t2 = x.targets();
  for (const m of few) assert.deepEqual(t2.filter((t) => t.message_id === m.id && t.kind === 'role').map((t) => t.value), ['mgr']);
});
