/* KIVO_265 · قفلُ اليوم في الخادم (مراجعةُ ما قبل النشر): اليومُ المُغلق بيده (true على «y-m-d» في bassam_tasks_locks_v1) لا تُضاف إليه مهامٌ جديدة —
   /api/tasks/create يُرفض بـ409 locked برسالةٍ صريحة، و/api/tasks/recur/run يتخطّاه (ويذكره في skipped) — في الوضعين القديم والإنفاذ.
   والقفلُ بانقضاء اليوم يبقى في الواجهة وحدها (المسؤول يعتمد ويمدّد ويعيد الإسناد على قفل الشهر)، والموظفُ لا يتأثّر. بياناتٌ اصطناعية (TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, D, DAY, TOMORROW, KT, stored, putKV, hij, HR } from './tasks_fx.mjs';

const WU = workerUnderTest();
const KL = 'bsdept:' + D + ':bassam_tasks_locks_v1';
for (const mode of ['legacy', 'enforce']) {
  test(`[${mode}] اليومُ المُغلق بيده: الإنشاءُ يُرفض والتكرارُ يتخطّاه — واليومُ المفتوح يقبل`, async t => {
    // This scenario needs two future hours in the SAME operational day. At
    // 01:00 Riyadh, +2h correctly belongs to the following (closed) day.
    const daytime = new Date(); daytime.setUTCHours(9, 0, 0, 0);
    t.mock.timers.enable({ apis: ['Date'], now: daytime.getTime() });
    const W = await world({ worker: WU.file, mode });
    const dm = await W.login('0000000101', '70101');
    putKV(W.env, KL, Object.assign({}, stored(W.env, KL) || {}, { [TOMORROW]: true }));
    /* إنشاءٌ على الغد المُغلق ⇒ 409 */
    const s1 = Date.now() + 24 * HR, k1 = hij(s1 - 3 * HR);
    assert.equal(k1, TOMORROW);
    const r1 = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: { k: k1, t: 'TEST_ONLY على يومٍ مُغلق', s: s1, e: s1 + HR, asg: [ME.eid] } });
    assert.equal(r1.status, 409, JSON.stringify(r1.j)); assert.equal(r1.j.err, 'locked'); assert.match(r1.j.msg || '', /اليومُ مُغلق/);
    /* إنشاءٌ على اليوم المفتوح ⇒ يُقبل */
    const s2 = Date.now() + 2 * HR, k2 = hij(s2 - 3 * HR);
    const r2 = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: { k: k2, t: 'TEST_ONLY سلسلةٌ يومية', s: s2, e: s2 + HR, asg: [ME.eid], win: { early: 240 }, rec: { t: 'daily', open: 1 } } });
    assert.equal(r2.status, 200, JSON.stringify(r2.j)); assert.equal(r2.j.ok, 1);
    /* التكرارُ لا يولّد نسخةً في الغد المُغلق */
    const rr = await W.C.api('/api/tasks/recur/run', { method: 'POST', cookie: dm.ck, body: {} });
    assert.equal(rr.status, 200, JSON.stringify(rr.j));
    const S = stored(W.env, KT), on = (d) => (S[d] || []).filter((r) => Array.isArray(r) && /سلسلةٌ يومية/.test(r[0])).length;
    assert.equal(on(TOMORROW), 0, 'لا نسخةَ في اليوم المُغلق');
    assert.ok((rr.j.skipped || []).some((x) => x.k === TOMORROW && /مُغلق/.test(x.why || '')), JSON.stringify(rr.j.skipped));
    assert.ok(Object.keys(S).some((d) => d !== DAY && d !== TOMORROW && on(d) > 0), 'وتُولَّد في غيره');
    /* فتحُ الغد ({mo:1} أو حذفُ الإغلاق) يعيد الإنشاء */
    putKV(W.env, KL, Object.assign({}, stored(W.env, KL) || {}, { [TOMORROW]: { mo: 1 } }));
    const r3 = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: { k: k1, t: 'TEST_ONLY بعد الفتح', s: s1, e: s1 + HR, asg: [ME.eid] } });
    assert.equal(r3.status, 200, JSON.stringify(r3.j));
  });
  test(`[${mode}] موعد بعد 03:00 الرياض يخضع لقفل اليوم التشغيلي التالي`, async t => {
    const boundary = new Date(); boundary.setUTCHours(22, 30, 0, 0);
    t.mock.timers.enable({ apis: ['Date'], now: boundary.getTime() });
    const W = await world({ worker: WU.file, mode }), dm = await W.login('0000000101', '70101');
    const start = Date.now() + 2 * HR, next = hij(start - 3 * HR);
    assert.equal(next, TOMORROW);
    putKV(W.env, KL, Object.assign({}, stored(W.env, KL) || {}, { [next]: true }));
    const result = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: { k: next, t: 'TEST_ONLY operational boundary', s: start, e: start + HR, asg: [ME.eid] } });
    assert.equal(result.status, 409); assert.equal(result.j.err, 'locked');
  });
}
