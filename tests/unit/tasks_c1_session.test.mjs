/* KIVO_264 · KIVO-Tasks — C1 على مسارات المهام (عقدُ /api/save نفسُه · التدقيقُ المعماري D-3): كلُّ طلبٍ من صفحةٍ بُنيت لجلسةٍ يحمل هويتَها (BOOT.uid)
   فإن دخل حسابٌ آخر في المتصفح نفسِه (الكوكي لغيرها) ردّ الخادمُ 409 session-changed قبل أيّ قراءةٍ أو كتابة — فلا يُنفَّذ فعلُ «ملفي ← مهامي»
   ولا فعلُ المسؤول في صفحة «المهام» باسم غير صاحب الصفحة، ولا تُقرأ مهامُ الحساب الآخر في صفحةٍ ليست له. الغائبُ = كما كان (عملاءُ ما قبل 264).
   بياناتٌ اصطناعية وحدها (tasks_fx · TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, MATE, KT, DAY, stored, rowsOf, taskCommandBody } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'];

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] C1: uid ≠ صاحب الجلسة ⇒ 409 session-changed بلا أثر · uid صاحبها أو غيابُه ⇒ كما كان', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login('0000000101', '70101');
    const mine = rowsOf(stored(W.env, KT), ME.eid).find((x) => x.day === DAY && x.r[3] === 'pending' && !x.r[11]);
    assert.ok(mine, 'مهمةٌ تنتظر البدء في المُثبِّت');
    const body = (uid) => Object.assign({ k: mine.day, id: mine.r[13], act: 'ack' }, uid === undefined ? {} : { uid });
    const S0 = JSON.stringify(stored(W.env, KT));
    /* الموظف: صفحةٌ بُنيت لزميله (MATE) ثم دخل هو في المتصفح نفسِه */
    const x1 = await W.C.api('/api/me/tasks/act', { method: 'POST', cookie: me.ck, body: body(MATE.uid) });
    assert.equal(x1.status, 409, JSON.stringify(x1.j)); assert.equal(x1.j.err, 'session-changed');
    assert.equal(JSON.stringify(stored(W.env, KT)), S0, 'لا أثر في المخزن');
    for (const p of ['/api/me/tasks', '/api/me/tasks/log?k=' + encodeURIComponent(mine.day) + '&id=' + mine.r[13]]) {
      const g = await W.C.api(p + (p.includes('?') ? '&' : '?') + 'uid=' + MATE.uid, { cookie: me.ck });
      assert.equal(g.status, 409, p + ' ⇒ ' + g.status); assert.equal(g.j.err, 'session-changed', p);
    }
    /* هويةُ الجلسة نفسُها ⇒ يمرّ · وغيابُها (عميلٌ أقدم) ⇒ كما كان */
    const ok = await W.C.api('/api/me/tasks/act', { method: 'POST', cookie: me.ck, body: body(ME.uid) });
    assert.equal(ok.status, 200, JSON.stringify(ok.j)); assert.equal(ok.j.ok, 1);
    const l1 = await W.C.api('/api/me/tasks?uid=' + ME.uid, { cookie: me.ck }); assert.equal(l1.status, 200); assert.ok(Array.isArray(l1.j.rows));
    const l0 = await W.C.api('/api/me/tasks', { cookie: me.ck }); assert.equal(l0.status, 200);
    /* المسؤول: إنشاءٌ ومراجعةٌ ومرشّحاتُ القراءة من صفحةٍ بُنيت لغيره ⇒ 409 قبل الصلاحية والكتابة */
    const S1 = JSON.stringify(stored(W.env, KT));
    const c = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: taskCommandBody(W.env, '/api/tasks/create', { k: DAY, t: 'TEST_ONLY C1', s: Date.now(), e: Date.now() + 3600e3, asg: [ME.eid], force: true, uid: 'tst_emp1' }) });
    assert.equal(c.status, 409, JSON.stringify(c.j)); assert.equal(c.j.err, 'session-changed');
    const lk = await W.C.api('/api/tasks/linkage?dept=tst_d1&uid=tst_emp1', { cookie: dm.ck }); assert.equal(lk.status, 409);
    assert.equal(JSON.stringify(stored(W.env, KT)), S1, 'لا أثر في المخزن');
    const c2 = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: taskCommandBody(W.env, '/api/tasks/create', { k: DAY, t: 'TEST_ONLY C1', s: Date.now(), e: Date.now() + 3600e3, asg: [ME.eid], force: true, uid: dm.j.uid }) });
    assert.equal(c2.status, 200, JSON.stringify(c2.j)); assert.equal(c2.j.ok, 1);
    /* uid بنوعٍ خاطئ ⇒ مخطّطُ الجسم (SOT-101) قبل كلّ شيء · وJSON غيرُ مفهوم ⇒ bad-body $ كسائر المسارات المغيِّرة */
    const bt = await W.C.api('/api/me/tasks/act', { method: 'POST', cookie: me.ck, body: Object.assign(body(), { uid: 7 }) });
    assert.equal(bt.status, 400); assert.equal(bt.j.err, 'bad-body'); assert.equal(bt.j.at, 'uid');
    for (const p of ['/api/me/tasks/act', '/api/tasks/review']) {
      const r = await W.C.req(p, { method: 'POST', cookie: p.includes('/me/') ? me.ck : dm.ck, body: '{nope', headers: { 'Content-Type': 'application/json' } });
      assert.equal(r.status, 400, p); const j = await r.json(); assert.equal(j.err, 'bad-body', p); assert.equal(j.at, '$', p);
    }
  });
}
